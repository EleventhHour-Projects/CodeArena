package main

import (
	"bot/battle"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
)

// LogBuffer stores the last N lines of logs
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
	// Return a copy
	res := make([]string, len(lb.lines))
	copy(res, lb.lines)
	return res
}

var globalLogBuffer = &LogBuffer{max: 100}

const DEFAULT_BOT_ID = "69da0e073660af6b7724e832"

var (
	activeBots = make(map[string]context.CancelFunc)
	mu         sync.Mutex
)

type SpawnRequest struct {
	BotID      string `json:"bot_id"`
	UserID     string `json:"user_id"`
	Difficulty string `json:"difficulty"`
}

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

	if req.BotID == "" {
		req.BotID = DEFAULT_BOT_ID
	}
	if req.UserID == "" {
		req.UserID = DEFAULT_BOT_ID
	}

	if req.Difficulty == "" {
		http.Error(w, "difficulty is required", http.StatusBadRequest)
		return
	}

	log.Printf("Received spawn request: BotID=%s, UserID=%s, Difficulty=%s\n", req.BotID, req.UserID, req.Difficulty)

	mu.Lock()
	// Stop existing bot if already running
	if cancel, exists := activeBots[req.BotID]; exists {
		cancel()
		delete(activeBots, req.BotID)
	}

	ctx, cancel := context.WithCancel(context.Background())
	activeBots[req.BotID] = cancel
	mu.Unlock()

	// Spawn the bot in a goroutine
	go func() {
		battle.SpawnBot(ctx, req.BotID, req.UserID, req.Difficulty)
		mu.Lock()
		delete(activeBots, req.BotID)
		mu.Unlock()
	}()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Bot spawning initiated",
		"bot_id":  req.BotID,
		"status":  "success",
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
	if cancel, exists := activeBots[req.BotID]; exists {
		cancel()
		delete(activeBots, req.BotID)
		mu.Unlock()
		log.Printf("Stop request processed for BotID=%s\n", req.BotID)
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "Bot stop signal sent"})
	} else {
		mu.Unlock()
		log.Printf("Stop request for non-active BotID=%s\n", req.BotID)
		http.Error(w, "Bot not active", http.StatusNotFound)
	}
}

func logsHandler(w http.ResponseWriter, r *http.Request) {
	logs := globalLogBuffer.GetLogs()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"logs": logs,
	})
}

func main() {
	// Redirect logs to our buffer
	log.SetOutput(globalLogBuffer)

	port := "8000"
	http.HandleFunc("/api/spawn", spawnHandler)
	http.HandleFunc("/api/stop", stopHandler)
	http.HandleFunc("/api/logs", logsHandler)

	fmt.Printf("Bot Service listening on port %s...\n", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}
