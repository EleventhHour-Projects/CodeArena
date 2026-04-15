package battle

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

// API URLs - Configuration via environment variables
var (
	BACKEND_URL         = getEnv("BACKEND_URL", "http://34.126.214.18:6969")
	APP_URL             = getEnv("APP_URL", "http://localhost:3000")
	MATCHMAKING_WSS_URL = getEnv("MATCHMAKING_WSS_URL", "wss://matchmake.codearena.pro")
	BATTLE_WSS_URL      = getEnv("BATTLE_WSS_URL", "wss://wss.codearena.pro")
)

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

type MatchmakingResponse struct {
	Token string `json:"token"`
}

type BattleMetadata struct {
	Success bool `json:"success"`
	Battle  struct {
		ID       string `json:"_id"`
		Player1  string `json:"player1"`
		Player2  string `json:"player2"`
		Status   string `json:"status"`
		Problems []struct {
			ID         int    `json:"id"`
			Difficulty string `json:"difficulty"`
		} `json:"problems"`
	} `json:"battle"`
}

type ProblemDetails struct {
	Problems []struct {
		ID          int    `json:"id"`
		Title       string `json:"title"`
		Difficulty  string `json:"difficulty"`
		Description string `json:"description"`
	} `json:"problems"`
}

type BotProgress struct {
	BattleID       string
	BotID          string
	Difficulty     string
	Problems       []Problem
	SolveTimes     []time.Duration
	SurrenderTime  *time.Duration
	StartTime      time.Time
	DrawsReceived  int
	SolvedCount    int
	CurrentProblem int
	IsPlayer1      bool // Detected from battle metadata
	Socket         *websocket.Conn
	// Cancel is called by the socket handler when the battle ends on the server
	// side, ensuring the simulation loop stops and the instance self-cleans.
	Cancel context.CancelFunc
}

type Problem struct {
	ID         int
	Difficulty string
	Solution   string
}

func GetMatchmakingToken(client http.Client, botid, difficulty string) (string, error) {
	payload := map[string]string{
		"user_id":    botid,
		"difficulty": difficulty,
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		log.Println("Error marshaling JSON:", err)
		return "", err
	}
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/api/matchmaking/register", BACKEND_URL), bytes.NewBuffer(jsonPayload))
	if err != nil {
		log.Println(err)
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		log.Println(err)
		return "", err
	}
	defer resp.Body.Close()

	var matchmakingResp MatchmakingResponse
	if err := json.NewDecoder(resp.Body).Decode(&matchmakingResp); err != nil {
		log.Println("Error decoding JSON:", err)
		return "", err
	}

	return matchmakingResp.Token, nil
}

func GetSolutionCode(problemID int) string {
	filename := fmt.Sprintf("battle/solutions/%d.cpp", problemID)
	data, err := os.ReadFile(filename)
	if err != nil {
		// Log error and return stub
		log.Printf("Warning: Solution for Problem %d not found (%s). Using stub.\n", problemID, filename)
		return fmt.Sprintf("// Solution for Problem %d\n#include <iostream>\nint main() { std::cout << \"Hello CodeArena\"; return 0; }", problemID)
	}
	return string(data)
}

func (p *BotProgress) CalculateSolveTimes() {
	rand.Seed(time.Now().UnixNano())
	p.SolveTimes = make([]time.Duration, len(p.Problems))

	for i, prob := range p.Problems {
		var minutes int
		r := rand.Intn(100)

		switch prob.Difficulty {
		case "Easy":
			if r < 30 {
				minutes = rand.Intn(6) + 5 // 5-10
			} else if r < 60 {
				minutes = rand.Intn(5) + 11 // 11-15
			} else {
				minutes = rand.Intn(5) + 16 // 16-20
			}
		case "Medium":
			if r < 30 {
				minutes = rand.Intn(6) + 10 // 10-15
			} else if r < 60 {
				minutes = rand.Intn(5) + 16 // 16-20
			} else {
				minutes = rand.Intn(5) + 21 // 21-25
			}
		case "Hard":
			if r < 50 {
				minutes = rand.Intn(6) + 15 // 15-20
			} else if r < 75 {
				minutes = rand.Intn(11) + 20 // 20-30
			} else {
				// 25% chance to take 30-40 mins
				minutes = rand.Intn(11) + 30
			}
		}
		p.SolveTimes[i] = time.Duration(minutes) * time.Minute
	}

	// Make SolveTimes cumulative and log the schedule
	log.Printf("Bot %s generated solve intervals: %v\n", p.BotID, p.SolveTimes)
	for i := 1; i < len(p.SolveTimes); i++ {
		p.SolveTimes[i] += p.SolveTimes[i-1]
	}
	log.Printf("Bot %s final cumulative solve schedule: %v\n", p.BotID, p.SolveTimes)

	// 25% chance to surrender after 30 mins
	if rand.Intn(100) < 25 {
		st := 30 * time.Minute
		p.SurrenderTime = &st
	}
}

func SpawnBot(ctx context.Context, botid, userID, difficulty string) {
	client := http.Client{}
	token, err := GetMatchmakingToken(client, botid, difficulty)
	if err != nil {
		log.Println("Error getting matchmaking token:", err)
		return
	}

	log.Printf("Bot %s received matchmaking token: %s\n", botid, token)
	battleID, err := JoinMatchMakingWebSocket(token, botid)
	if err != nil {
		log.Printf("Bot %s error joining matchmaking websocket: %v\n", botid, err)
		return
	}

	log.Printf("Bot %s joined battle with ID: %s\n", botid, battleID)

	// Start Battle Simulation
	handleBattle(ctx, botid, battleID, difficulty)
}

func handleBattle(ctx context.Context, botID, battleID, difficulty string) {
	log.Printf("Bot %s starting battle simulation for %s\n", botID, battleID)

	// Create a battle-scoped context. The socket handler can cancel it when
	// the battle ends on the server side, stopping the simulation loop cleanly.
	battleCtx, battleCancel := context.WithCancel(ctx)
	defer battleCancel()

	// 1. Fetch Battle Metadata
	metadata, err := fetchBattleMetadata(battleID)
	if err != nil {
		log.Printf("Error fetching metadata: %v\n", err)
		return
	}

	// 2. Fetch Problem Details
	probIDs := make([]int, len(metadata.Battle.Problems))
	for i, p := range metadata.Battle.Problems {
		probIDs[i] = p.ID
	}
	problems, err := fetchProblemDetails(probIDs)
	if err != nil {
		log.Printf("Error fetching problems: %v\n", err)
		return
	}

	progress := &BotProgress{
		BattleID:   battleID,
		BotID:      botID,
		Difficulty: difficulty,
		StartTime:  time.Now(),
		Problems:   make([]Problem, len(problems.Problems)),
		Cancel:     battleCancel, // allows socket handler to self-terminate
	}

	for i, p := range problems.Problems {
		progress.Problems[i] = Problem{
			ID:         p.ID,
			Difficulty: p.Difficulty,
			Solution:   GetSolutionCode(p.ID),
		}
	}

	progress.CalculateSolveTimes()
	log.Printf("Bot %s solve schedule: %v\n", botID, progress.SolveTimes)

	// 2.5 Determine Role
	if metadata.Battle.Player1 == botID {
		progress.IsPlayer1 = true
	}
	log.Printf("Bot %s detected role: Player 1 = %v\n", botID, progress.IsPlayer1)

	// 3. Connect to Battle WebSocket (Socket.IO)
	conn, err := connectToBattleSocket(botID, battleID)
	if err != nil {
		log.Printf("Error connecting to battle socket: %v\n", err)
		// Fallback: simulation runs without socket; will finish when problems solved.
	} else {
		progress.Socket = conn
		go handleSocketMessages(battleCtx, progress)
	}

	runSimulationLoop(battleCtx, progress)
	log.Printf("Bot %s battle %s ended — self-cancelling\n", botID, battleID)
}

func connectToBattleSocket(botID, battleID string) (*websocket.Conn, error) {
	// Ensure the URL is correctly parsed from the environment
	parsed, err := url.Parse(BATTLE_WSS_URL)
	if err != nil {
		return nil, fmt.Errorf("invalid BATTLE_WSS_URL: %v", err)
	}

	u := url.URL{
		Scheme:   parsed.Scheme,
		Host:     parsed.Host,
		Path:     "/socket.io/",
		RawQuery: "EIO=4&transport=websocket",
	}
	log.Printf("[BATTLE] Connecting to Hub: %s\n", u.String())

	conn, _, err := websocket.DefaultDialer.Dial(u.String(), nil)
	if err != nil {
		log.Printf("[BATTLE] Connection Failed: %v\n", err)
		return nil, err
	}

	// 1. Wait for packet 0 (Open)
	_, p0, err := conn.ReadMessage()
	if err != nil || !strings.HasPrefix(string(p0), "0") {
		conn.Close()
		return nil, fmt.Errorf("did not receive open packet: %v", err)
	}

	// 2. Send 40 (Namespace connect)
	if err := conn.WriteMessage(websocket.TextMessage, []byte("40")); err != nil {
		conn.Close()
		return nil, err
	}

	// 3. Wait for packet 40 (Namespace connected ack)
	_, p40, err := conn.ReadMessage()
	if err != nil || !strings.HasPrefix(string(p40), "40") {
		conn.Close()
		return nil, fmt.Errorf("did not receive namespace connect ack: %v", err)
	}

	// 4. Send JOIN_BATTLE event
	joinMsg := fmt.Sprintf(`42["JOIN_BATTLE",{"battleId":"%s","userId":"%s"}]`, battleID, botID)
	if err := conn.WriteMessage(websocket.TextMessage, []byte(joinMsg)); err != nil {
		conn.Close()
		return nil, err
	}
	log.Printf("[BATTLE] Joined battle %s as %s successfully\n", battleID, botID)

	return conn, nil
}

// battleEndEvents is the set of Socket.IO event types that signal the battle
// is definitively over. When any of these arrive the bot self-cancels.
var battleEndEvents = map[string]bool{
	"BATTLE_ENDED":    true,
	"GAME_OVER":       true,
	"PLAYER_WON":      true,
	"BATTLE_COMPLETE": true,
	"BATTLE_RESULT":   true,
}

func handleSocketMessages(ctx context.Context, p *BotProgress) {
	conn := p.Socket
	defer func() {
		conn.Close()
		// When this goroutine exits for ANY reason (socket closed by server,
		// battle-end event, or external ctx cancel), ensure the simulation
		// loop is also stopped so the instance self-cleans from main.go.
		if p.Cancel != nil {
			p.Cancel()
		}
	}()

	for {
		select {
		case <-ctx.Done():
			log.Printf("Bot %s socket handler stopping via context\n", p.BotID)
			return
		default:
			_, message, err := conn.ReadMessage()
			if err != nil {
				// Socket closed — most likely the server ended the battle.
				log.Printf("Bot %s battle socket closed (battle ended): %v\n", p.BotID, err)
				return // defer will call p.Cancel()
			}

			msgStr := string(message)
			if strings.HasPrefix(msgStr, "42") {
				var event []json.RawMessage
				if err := json.Unmarshal([]byte(msgStr[2:]), &event); err == nil && len(event) >= 2 {
					var eventName string
					json.Unmarshal(event[0], &eventName)

					if eventName == "event" {
						var payload struct {
							Type   string `json:"type"`
							UserId string `json:"userId"`
						}
						json.Unmarshal(event[1], &payload)

						switch {
						case battleEndEvents[payload.Type]:
							// Server explicitly signalled battle is over.
							log.Printf("Bot %s received battle-end event %q — self-cancelling\n", p.BotID, payload.Type)
							return // defer will call p.Cancel()

						case payload.Type == "USER_SURRENDER" && payload.UserId != p.BotID:
							// Opponent surrendered — battle is won, no point continuing.
							log.Printf("Bot %s: opponent surrendered — self-cancelling\n", p.BotID)
							return // defer will call p.Cancel()

						case payload.Type == "DRAW_REQUEST" && payload.UserId != p.BotID:
							if handleDrawRequest(p) {
								log.Printf("Bot %s accepted draw — self-cancelling\n", p.BotID)
								return
							}
						}
					}
				}
			} else if msgStr == "2" {
				conn.WriteMessage(websocket.TextMessage, []byte("3")) // Pong
			}
		}
	}
}

func handleDrawRequest(p *BotProgress) bool {
	p.DrawsReceived++
	log.Printf("Bot %s received draw request #%d\n", p.BotID, p.DrawsReceived)

	acceptProb := 0
	if p.DrawsReceived == 1 {
		acceptProb = 75
	} else if p.DrawsReceived >= 2 {
		acceptProb = 90
	}

	accepted := rand.Intn(100) < acceptProb
	log.Printf("Bot %s draw decision: accepted=%v (prob=%d%%)\n", p.BotID, accepted, acceptProb)

	response := fmt.Sprintf(`42["event",{"type":"DRAW_RESPONSE","battleId":"%s","userId":"%s","data":{"accepted":%v}}]`, p.BattleID, p.BotID, accepted)
	p.Socket.WriteMessage(websocket.TextMessage, []byte(response))

	return accepted
}

func fetchBattleMetadata(battleID string) (*BattleMetadata, error) {
	resp, err := http.Get(fmt.Sprintf("%s/api/battle/%s", APP_URL, battleID))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var meta BattleMetadata
	if err := json.NewDecoder(resp.Body).Decode(&meta); err != nil {
		return nil, err
	}
	return &meta, nil
}

func fetchProblemDetails(ids []int) (*ProblemDetails, error) {
	idStrs := make([]string, len(ids))
	for i, id := range ids {
		idStrs[i] = fmt.Sprint(id)
	}
	url := fmt.Sprintf("%s/api/battle/questions?ids=%s", APP_URL, strings.Join(idStrs, ","))
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var probs ProblemDetails
	if err := json.NewDecoder(resp.Body).Decode(&probs); err != nil {
		return nil, err
	}
	return &probs, nil
}

func runSimulationLoop(ctx context.Context, p *BotProgress) {
	ticker := time.NewTicker(30 * time.Second) // For recordings
	defer ticker.Stop()

	checkInterval := time.NewTicker(10 * time.Second)
	defer checkInterval.Stop()

	// Initial Delay to simulate joining
	select {
	case <-time.After(2 * time.Second):
	case <-ctx.Done():
		return
	}

	log.Printf("Bot %s entering simulation loop\n", p.BotID)

	for {
		select {
		case <-ctx.Done():
			log.Printf("Bot %s simulation loop stopping via context\n", p.BotID)
			return
		case <-ticker.C:
			// Send recording snapshot
			sendSnapshot(p)

		case <-checkInterval.C:
			elapsed := time.Since(p.StartTime)
			// 1. Check if battle ended externally (e.g., opponent solved all problems)
			meta, err := fetchBattleMetadata(p.BattleID)
			if err == nil && meta.Battle.Status == "Completed" {
				log.Printf("Bot %s detected battle %s is completed via API. Stopping simulation.\n", p.BotID, p.BattleID)
				return
			}
			// Check for surrender
			if p.SurrenderTime != nil && elapsed >= *p.SurrenderTime {
				log.Printf("Bot %s surrendering at %v\n", p.BotID, elapsed)
				surrender(p)
				return
			}

			// Check for next problem solving
			if p.CurrentProblem < len(p.Problems) {
				targetTime := p.SolveTimes[p.CurrentProblem]
				if elapsed >= targetTime {
					log.Printf("Bot %s solving problem %d (Index %d) at %v (Scheduled: %v)\n", p.BotID, p.Problems[p.CurrentProblem].ID, p.CurrentProblem, elapsed, targetTime)
					// solveProblem is now async to avoid blocking the main simulation loop
					go solveProblem(p, p.CurrentProblem)
					p.CurrentProblem++
				}
			} else {
				log.Printf("Bot %s has solved all problems. Finishing battle.\n", p.BotID)
				return // Battle finished
			}
		}
	}
}

func sendSnapshot(p *BotProgress) {
	// POST /api/battle/recording
	url := fmt.Sprintf("%s/api/battle/recording", APP_URL)

	currentProbIdx := p.CurrentProblem
	if currentProbIdx >= len(p.Problems) {
		currentProbIdx = len(p.Problems) - 1
	}

	playerKey := "player2"
	if p.IsPlayer1 {
		playerKey = "player1"
	}

	payload := map[string]interface{}{
		"battleId": p.BattleID,
		"snapshots": []map[string]interface{}{
			{
				"timestamp": time.Since(p.StartTime).Seconds(),
				playerKey: map[string]interface{}{
					"code":         "// typing...",
					"problemIndex": currentProbIdx,
				},
			},
		},
		"final": false,
	}

	jsonPayload, _ := json.Marshal(payload)
	http.Post(url, "application/json", bytes.NewBuffer(jsonPayload))
}

func solveProblem(p *BotProgress, index int) {
	prob := p.Problems[index]

	// 1. Submit Code: POST /api/battle/exec-code
	url := fmt.Sprintf("%s/api/battle/exec-code", APP_URL)
	payload := map[string]interface{}{
		"code":       prob.Solution,
		"language":   "cpp",
		"userId":     p.BotID,
		"battleId":   p.BattleID,
		"difficulty": strings.ToLower(prob.Difficulty),
		"problemId":  prob.ID,
		"type":       "Submit",
	}

	jsonPayload, _ := json.Marshal(payload)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonPayload))
	if err != nil {
		log.Printf("Error submitting problem: %v\n", err)
		return
	}
	defer resp.Body.Close()

	var execResp struct {
		Success       bool `json:"success"`
		ExecutionCode struct {
			ID string `json:"_id"`
		} `json:"executionCode"`
	}
	json.NewDecoder(resp.Body).Decode(&execResp)

	if execResp.Success {
		// Poll for status
		pollStatus(execResp.ExecutionCode.ID)
	}
}

func pollStatus(execID string) {
	url := fmt.Sprintf("%s/api/submission-status/%s", APP_URL, execID)
	for i := 0; i < 10; i++ {
		time.Sleep(2 * time.Second)
		resp, err := http.Get(url)
		if err != nil {
			continue
		}
		var statusResp struct {
			Status string `json:"status"`
		}
		json.NewDecoder(resp.Body).Decode(&statusResp)
		resp.Body.Close()

		if statusResp.Status != "PENDING" {
			log.Printf("Submission %s finished with status: %s\n", execID, statusResp.Status)
			return
		}
	}
}

func surrender(p *BotProgress) {
	log.Printf("Bot %s surrendering battle %s\n", p.BotID, p.BattleID)
	if p.Socket != nil {
		msg := fmt.Sprintf(`42["event",{"type":"USER_SURRENDER","battleId":"%s","userId":"%s"}]`, p.BattleID, p.BotID)
		p.Socket.WriteMessage(websocket.TextMessage, []byte(msg))
	}
}

func JoinMatchMakingWebSocket(token, botID string) (string, error) {
	// Construct the URL using the environment variable
	base := strings.TrimRight(MATCHMAKING_WSS_URL, "/")
	wsURL := fmt.Sprintf(
		"%s/wss/matchmaking?token=%s&username=%s",
		base,
		url.QueryEscape(token),
		url.QueryEscape("codearenaBOT"),
	)

	log.Printf("[MATCHMAKING] Connecting to pool: %s\n", base)
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		return "", fmt.Errorf("websocket connection error: %v", err)
	}
	defer conn.Close()

	log.Println("Connected to matchmaking")

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			return "", fmt.Errorf("read error: %v", err)
		}

		log.Println("Received:", string(message))

		// Parse incoming message
		var resp map[string]interface{}
		if err := json.Unmarshal(message, &resp); err != nil {
			log.Println("Invalid JSON:", err)
			continue
		}

		if _, hasUser := resp["user"]; hasUser {
			err = conn.WriteJSON(map[string]string{
				"action": "accept",
			})
			if err != nil {
				return "", fmt.Errorf("write error: %v", err)
			}
			log.Println("Sent: accept")
		}

		// 🎯 Check for battle start
		if action, ok := resp["action"].(string); ok && action == "battle_begin" {
			if battleID, ok := resp["battleId"].(string); ok {
				log.Println("Battle started:", battleID)
				return battleID, nil
			}
			return "", fmt.Errorf("battle_begin received but battleId missing")
		}
	}
}
