package main

import (
	"bot/battle"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

// ─── Log Buffer ───────────────────────────────────────────────────────────────

type LogBuffer struct {
	lines []string
	max   int
	mu    sync.Mutex
}

func (lb *LogBuffer) Write(p []byte) (n int, err error) {
	lb.mu.Lock()
	defer lb.mu.Unlock()
	lb.lines = append(lb.lines, string(p))
	if len(lb.lines) > lb.max {
		lb.lines = lb.lines[1:]
	}
	return os.Stdout.Write(p)
}

func (lb *LogBuffer) GetLogs() []string {
	lb.mu.Lock()
	defer lb.mu.Unlock()
	res := make([]string, len(lb.lines))
	copy(res, lb.lines)
	return res
}

var globalLogBuffer = &LogBuffer{max: 200}

// ─── Bot Pool ─────────────────────────────────────────────────────────────────

const DEFAULT_BOT_ID = "69de72c58961bbd5a5c37278"

// botPool is the list of bot user IDs available for concurrent battles.
// Each entry must be a registered user account in the CodeArena system.
//
// Configure via the BOT_POOL environment variable (comma-separated IDs):
//
//	BOT_POOL="id1,id2,id3"
//
// If unset, only DEFAULT_BOT_ID is used (single-battle mode).
var botPool = initBotPool()

func initBotPool() []string {
	if v := os.Getenv("BOT_POOL"); v != "" {
		parts := strings.Split(v, ",")
		pool := make([]string, 0, len(parts))
		for _, p := range parts {
			if id := strings.TrimSpace(p); id != "" {
				pool = append(pool, id)
			}
		}
		if len(pool) > 0 {
			return pool
		}
	}
	return []string{DEFAULT_BOT_ID}
}

// selectBotFromPool returns the least-busy bot ID in the pool.
// Prefers completely idle bots; falls back to least-loaded.
// MUST be called with mu held.
func selectBotFromPool() string {
	for _, id := range botPool {
		if len(activeBots[id]) == 0 {
			return id
		}
	}
	// All bots busy — pick least loaded
	best := botPool[0]
	for _, id := range botPool[1:] {
		if len(activeBots[id]) < len(activeBots[best]) {
			best = id
		}
	}
	return best
}

// ─── State ────────────────────────────────────────────────────────────────────

// BattleInstance holds the cancel func and metadata for one active battle.
type BattleInstance struct {
	Cancel     context.CancelFunc
	InstanceID int
	BotID      string
	Difficulty string
	StartedAt  time.Time
}

var (
	// activeBots[botID][instanceID] = *BattleInstance
	activeBots     = make(map[string]map[int]*BattleInstance)
	nextInstanceID int
	mu             sync.Mutex
)

// ─── Types ────────────────────────────────────────────────────────────────────

type SpawnRequest struct {
	BotID      string `json:"bot_id"`
	UserID     string `json:"user_id"`
	Difficulty string `json:"difficulty"`
}

type InstanceInfo struct {
	InstanceID     int     `json:"instance_id"`
	BotID          string  `json:"bot_id"`
	Difficulty     string  `json:"difficulty"`
	StartedAt      string  `json:"started_at"`
	ElapsedSeconds float64 `json:"elapsed_seconds"`
}

type PoolEntry struct {
	BotID         string `json:"bot_id"`
	ActiveBattles int    `json:"active_battles"`
	Available     bool   `json:"available"`
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

func spawnHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req SpawnRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Difficulty == "" {
		http.Error(w, "difficulty is required", http.StatusBadRequest)
		return
	}

	mu.Lock()
	// Auto-select least-busy bot from pool if none specified
	if req.BotID == "" {
		req.BotID = selectBotFromPool()
	}
	if req.UserID == "" {
		req.UserID = req.BotID
	}

	if activeBots[req.BotID] == nil {
		activeBots[req.BotID] = make(map[int]*BattleInstance)
	}
	ctx, cancel := context.WithCancel(context.Background())
	instanceID := nextInstanceID
	nextInstanceID++
	instance := &BattleInstance{
		Cancel:     cancel,
		InstanceID: instanceID,
		BotID:      req.BotID,
		Difficulty: req.Difficulty,
		StartedAt:  time.Now(),
	}
	activeBots[req.BotID][instanceID] = instance
	activeBattleCount := len(activeBots[req.BotID])
	mu.Unlock()

	log.Printf("[SPAWN] Instance #%d → Bot %s | Difficulty: %s | Active battles for this bot: %d\n",
		instanceID, req.BotID, req.Difficulty, activeBattleCount)

	// Each battle runs in its own goroutine. Previous battles are not affected.
	go func() {
		battle.SpawnBot(ctx, req.BotID, req.UserID, req.Difficulty)
		// Self-cleanup
		mu.Lock()
		remaining := 0
		if activeBots[req.BotID] != nil {
			delete(activeBots[req.BotID], instanceID)
			remaining = len(activeBots[req.BotID])
			if remaining == 0 {
				delete(activeBots, req.BotID)
			}
		}
		mu.Unlock()
		log.Printf("[DONE] Instance #%d for Bot %s finished. Remaining battles: %d\n",
			instanceID, req.BotID, remaining)
	}()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":        "Bot spawning initiated",
		"bot_id":         req.BotID,
		"instance_id":    instanceID,
		"active_battles": activeBattleCount,
		"status":         "success",
	})
}

func stopHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		BotID string `json:"bot_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if req.BotID == "" {
		req.BotID = DEFAULT_BOT_ID
	}

	mu.Lock()
	if battles, exists := activeBots[req.BotID]; exists {
		stopped := len(battles)
		for _, inst := range battles {
			inst.Cancel()
		}
		delete(activeBots, req.BotID)
		mu.Unlock()
		log.Printf("[STOP] Bot %s — cancelled %d battle(s)\n", req.BotID, stopped)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message":           "Bot stop signal sent",
			"battles_cancelled": stopped,
		})
	} else {
		mu.Unlock()
		http.Error(w, "Bot not active", http.StatusNotFound)
	}
}

func stopAllHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	mu.Lock()
	total := 0
	for _, battles := range activeBots {
		for _, inst := range battles {
			inst.Cancel()
			total++
		}
	}
	activeBots = make(map[string]map[int]*BattleInstance)
	mu.Unlock()

	log.Printf("[STOP-ALL] Cancelled %d active battle(s) across all bots\n", total)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":           "All battles stopped",
		"battles_cancelled": total,
	})
}

func stopInstanceHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		BotID      string `json:"bot_id"`
		InstanceID int    `json:"instance_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	mu.Lock()
	if battles, ok := activeBots[req.BotID]; ok {
		if inst, ok := battles[req.InstanceID]; ok {
			inst.Cancel()
			delete(battles, req.InstanceID)
			if len(battles) == 0 {
				delete(activeBots, req.BotID)
			}
			mu.Unlock()
			log.Printf("[STOP-INSTANCE] Cancelled instance #%d for Bot %s\n", req.InstanceID, req.BotID)
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"message":     "Instance cancelled",
				"instance_id": req.InstanceID,
			})
			return
		}
	}
	mu.Unlock()
	http.Error(w, "Instance not found", http.StatusNotFound)
}

func statusHandler(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()

	instances := []InstanceInfo{}
	total := 0
	for _, battles := range activeBots {
		for _, inst := range battles {
			instances = append(instances, InstanceInfo{
				InstanceID:     inst.InstanceID,
				BotID:          inst.BotID,
				Difficulty:     inst.Difficulty,
				StartedAt:      inst.StartedAt.UTC().Format(time.RFC3339),
				ElapsedSeconds: time.Since(inst.StartedAt).Seconds(),
			})
			total++
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"total_active_battles": total,
		"instances":            instances,
	})
}

func poolHandler(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()

	entries := make([]PoolEntry, len(botPool))
	for i, id := range botPool {
		count := len(activeBots[id])
		entries[i] = PoolEntry{
			BotID:         id,
			ActiveBattles: count,
			Available:     count == 0,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"pool":       entries,
		"total_bots": len(botPool),
	})
}

func logsHandler(w http.ResponseWriter, r *http.Request) {
	logs := globalLogBuffer.GetLogs()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"logs": logs,
	})
}

// ─── Main ─────────────────────────────────────────────────────────────────────

func main() {
	log.SetOutput(globalLogBuffer)

	port := "8000"
	http.HandleFunc("/api/spawn", spawnHandler)
	http.HandleFunc("/api/stop", stopHandler)
	http.HandleFunc("/api/stop-all", stopAllHandler)
	http.HandleFunc("/api/stop-instance", stopInstanceHandler)
	http.HandleFunc("/api/status", statusHandler)
	http.HandleFunc("/api/pool", poolHandler)
	http.HandleFunc("/api/logs", logsHandler)

	fmt.Printf("Bot Service listening on port %s...\n", port)
	fmt.Printf("Bot pool: %d account(s) → %v\n", len(botPool), botPool)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}
