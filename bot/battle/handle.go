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
	InstanceID          int
	BattleID            string
	BotID               string
	Difficulty          string
	Problems            []Problem
	SolveTimes          []time.Duration
	WrongAttemptTimes   []time.Duration
	CurrentWrongAttempt int
	SurrenderTime       *time.Duration
	TotalDuration       time.Duration
	StartTime           time.Time
	DrawsReceived       int
	SolvedCount         int
	CurrentProblem      int
	IsPlayer1           bool // Detected from battle metadata
	Socket              *websocket.Conn
	// Logger is a callback provided by the caller to record instance-specific logs.
	Logger func(instanceID int, message string)
	// Cancel is called by the socket handler when the battle ends on the server
	// side, ensuring the simulation loop stops and the instance self-cleans.
	Cancel context.CancelFunc
}

func (p *BotProgress) Log(format string, args ...interface{}) {
	msg := fmt.Sprintf(format, args...)
	if p.Logger != nil {
		p.Logger(p.InstanceID, msg)
	} else {
		log.Printf("[INST#%d] %s", p.InstanceID, msg)
	}
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
			if r < 79 {
				minutes = rand.Intn(6) + 5 // 5-10
			} else if r < 91 {
				minutes = rand.Intn(5) + 11 // 11-15
			} else {
				minutes = rand.Intn(5) + 16 // 16-20
			}
		case "Medium":
			if r < 52 {
				minutes = rand.Intn(6) + 10 // 10-15
			} else if r < 78 {
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

	// --- NEW: Generate Random Wrong Executions (4-10 times) ---
	wrongCount := rand.Intn(7) + 4 // 4 to 10
	p.WrongAttemptTimes = make([]time.Duration, wrongCount)
	totalSec := int(p.TotalDuration.Seconds())
	if totalSec <= 0 {
		totalSec = 1800 // Fallback 30 mins
	}

	for i := 0; i < wrongCount; i++ {
		// Random time between 1 min and TotalDuration - 1 min
		sec := rand.Intn(totalSec-120) + 60
		p.WrongAttemptTimes[i] = time.Duration(sec) * time.Second
	}
	// Sort them
	for i := 0; i < len(p.WrongAttemptTimes); i++ {
		for j := i + 1; j < len(p.WrongAttemptTimes); j++ {
			if p.WrongAttemptTimes[i] > p.WrongAttemptTimes[j] {
				p.WrongAttemptTimes[i], p.WrongAttemptTimes[j] = p.WrongAttemptTimes[j], p.WrongAttemptTimes[i]
			}
		}
	}
	log.Printf("Bot %s scheduled %d wrong executions at: %v\n", p.BotID, wrongCount, p.WrongAttemptTimes)

	// 25% chance to surrender after 30 mins
	if rand.Intn(100) < 25 {
		st := 30 * time.Minute
		p.SurrenderTime = &st
	}
}

func SpawnBot(ctx context.Context, instanceID int, botid, userID, difficulty string, onMetadata func(oppID, oppName string), logger func(int, string)) {
	client := http.Client{}
	token, err := GetMatchmakingToken(client, botid, difficulty)
	if err != nil {
		if logger != nil {
			logger(instanceID, fmt.Sprintf("Error getting matchmaking token: %v", err))
		}
		return
	}

	if logger != nil {
		logger(instanceID, fmt.Sprintf("Received matchmaking token: %s", token))
	}
	battleID, opponentName, err := JoinMatchMakingWebSocket(token, botid)
	if err != nil {
		if logger != nil {
			logger(instanceID, fmt.Sprintf("Error joining matchmaking websocket: %v", err))
		}
		return
	}

	if logger != nil {
		logger(instanceID, fmt.Sprintf("Joined battle with ID: %s", battleID))
	}

	// Start Battle Simulation
	handleBattle(ctx, instanceID, botid, battleID, opponentName, difficulty, onMetadata, logger)
}

func handleBattle(ctx context.Context, instanceID int, botID, battleID, opponentName, difficulty string, onMetadata func(oppID, oppName string), logger func(int, string)) {
	if logger != nil {
		logger(instanceID, fmt.Sprintf("Starting battle simulation for %s", battleID))
	}

	// Create a battle-scoped context. The socket handler can cancel it when
	// the battle ends on the server side, stopping the simulation loop cleanly.
	battleCtx, battleCancel := context.WithCancel(ctx)
	defer battleCancel()

	// 1. Fetch Battle Metadata
	metadata, err := fetchBattleMetadata(battleID)
	if err != nil {
		log.Printf("[INST#%d] Error fetching metadata: %v\n", instanceID, err)
		return
	}

	// 2. Fetch Problem Details
	probIDs := make([]int, len(metadata.Battle.Problems))
	for i, p := range metadata.Battle.Problems {
		probIDs[i] = p.ID
	}
	problems, err := fetchProblemDetails(probIDs)
	if err != nil {
		log.Printf("[INST#%d] Error fetching problems: %v\n", instanceID, err)
		return
	}

	progress := &BotProgress{
		InstanceID: instanceID,
		BattleID:   battleID,
		BotID:      botID,
		Difficulty: difficulty,
		StartTime:  time.Now(),
		Problems:   make([]Problem, len(problems.Problems)),
		Logger:     logger,
		Cancel:     battleCancel,
	}

	var durationSeconds int
	for i, p := range problems.Problems {
		progress.Problems[i] = Problem{
			ID:         p.ID,
			Difficulty: p.Difficulty,
			Solution:   GetSolutionCode(p.ID),
		}
		diff := strings.ToLower(p.Difficulty)
		if diff == "easy" {
			durationSeconds += 10 * 60
		} else if diff == "hard" {
			durationSeconds += 35 * 60
		} else {
			durationSeconds += 15 * 60
		}
	}

	if durationSeconds == 0 {
		durationSeconds = 5400
	}
	progress.TotalDuration = time.Duration(durationSeconds) * time.Second

	progress.CalculateSolveTimes()
	progress.Log("Solve schedule: %v\n", progress.SolveTimes)

	// 2.5 Determine Role (Simple detection since battleID and IDs are available)
	if metadata.Battle.Player1 == botID {
		progress.IsPlayer1 = true
	}

	if onMetadata != nil {
		onMetadata("", opponentName) // We only have Name from matchmaking now
	}
	progress.Log("Detected role: Player 1 = %v | Playing against: %s\n", progress.IsPlayer1, opponentName)

	// 3. Connect to Battle WebSocket (Socket.IO)
	conn, err := connectToBattleSocket(botID, battleID)
	if err != nil {
		progress.Log("Error connecting to battle socket: %v\n", err)
		// Fallback: simulation runs without socket; will finish when problems solved.
	} else {
		progress.Socket = conn
		go handleSocketMessages(battleCtx, progress)
	}

	runSimulationLoop(battleCtx, progress)
	progress.Log("Battle ended — self-cancelling\n")
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
			p.Log("Socket handler stopping via context\n")
			return
		default:
			_, message, err := conn.ReadMessage()
			if err != nil {
				// Socket closed — most likely the server ended the battle.
				p.Log("Battle socket closed (battle ended): %v\n", err)
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
	p.Log("Received draw request #%d\n", p.DrawsReceived)

	acceptProb := 0
	if p.DrawsReceived == 1 {
		acceptProb = 42
	} else if p.DrawsReceived >= 2 {
		acceptProb = 69
	}

	accepted := rand.Intn(100) < acceptProb
	p.Log("Draw decision: accepted=%v (prob=%d%%)\n", accepted, acceptProb)

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
				p.Log("Detected battle completed via API. Stopping simulation.\n")
				return
			}
			// Check for surrender
			if p.SurrenderTime != nil && elapsed >= *p.SurrenderTime {
				p.Log("Surrendering at %v\n", elapsed)
				surrender(p)
				return
			}

			// Check if timer is over
			if elapsed >= p.TotalDuration {
				p.Log("Timer over at %v. Calling complete API\n", elapsed)
				callCompleteAPI(p)
				if p.Cancel != nil {
					p.Cancel()
				}
				return
			}

			// --- NEW: Check for wrong executions ---
			if p.CurrentWrongAttempt < len(p.WrongAttemptTimes) {
				if elapsed >= p.WrongAttemptTimes[p.CurrentWrongAttempt] {
					go runWrongExecution(p)
					p.CurrentWrongAttempt++
				}
			}

			// Check for next problem solving
			if p.CurrentProblem < len(p.Problems) {
				targetTime := p.SolveTimes[p.CurrentProblem]
				if elapsed >= targetTime {
					p.Log("Solving problem %d (Index %d) at %v (Scheduled: %v)\n", p.Problems[p.CurrentProblem].ID, p.CurrentProblem, elapsed, targetTime)
					// solveProblem is now async to avoid blocking the main simulation loop
					go solveProblem(p, p.CurrentProblem)
					p.CurrentProblem++
				}
			} else {
				p.Log("All problems solved. Finishing battle.\n")
				callCompleteAPI(p)
				if p.Cancel != nil {
					p.Cancel()
				}
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

func GetWrongCode(problemID int) string {
	boilerplate := []string{
		"#include <iostream>\nusing namespace std;\nint main() {\n    // Draft for Problem %d\n    int n;\n    // cin >> n;\n    cout << \"Solving...\" << endl;\n    return 0;\n}",
		"#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    vector<int> v = {1, 2, 3};\n    // Problem %d logic here\n    for(int x : v) cout << x << \" \";\n    return 0;\n}",
		"#include <iostream>\nint solve() {\n    return 42;\n}\nint main() {\n    std::cout << solve() << std::endl;\n    return 0;\n}",
	}
	idx := rand.Intn(len(boilerplate))
	return fmt.Sprintf(boilerplate[idx], problemID)
}

func runWrongExecution(p *BotProgress) {
	currentIdx := p.CurrentProblem
	if currentIdx >= len(p.Problems) {
		currentIdx = len(p.Problems) - 1
	}
	if currentIdx < 0 {
		return
	}

	prob := p.Problems[currentIdx]
	url := fmt.Sprintf("%s/api/battle/exec-code", APP_URL)
	payload := map[string]interface{}{
		"code":       GetWrongCode(prob.ID),
		"language":   "cpp",
		"userId":     p.BotID,
		"battleId":   p.BattleID,
		"difficulty": strings.ToLower(prob.Difficulty),
		"problemId":  prob.ID,
		"type":       "Run",
	}

	log.Printf("Bot %s performing wrong execution (Run) for problem %d\n", p.BotID, prob.ID)

	jsonPayload, _ := json.Marshal(payload)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonPayload))
	if err != nil {
		log.Printf("Error during wrong execution: %v\n", err)
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

func callCompleteAPI(p *BotProgress) {
	url := fmt.Sprintf("%s/api/battle/complete", APP_URL)
	payload := map[string]interface{}{
		"battleId": p.BattleID,
	}

	jsonPayload, _ := json.Marshal(payload)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonPayload))
	if err != nil {
		p.Log("Error calling complete API: %v\n", err)
		return
	}
	defer resp.Body.Close()
	p.Log("Successfully called complete API for battle %s\n", p.BattleID)
}

func surrender(p *BotProgress) {
	p.Log("Surrendering battle %s\n", p.BattleID)
	if p.Socket != nil {
		msg := fmt.Sprintf(`42["event",{"type":"USER_SURRENDER","battleId":"%s","userId":"%s"}]`, p.BattleID, p.BotID)
		p.Socket.WriteMessage(websocket.TextMessage, []byte(msg))
	}
}

func JoinMatchMakingWebSocket(token, botID string) (string, string, error) {
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
		return "", "", fmt.Errorf("websocket connection error: %v", err)
	}
	defer conn.Close()

	log.Println("Connected to matchmaking")

	var opponentName string
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			return "", "", fmt.Errorf("read error: %v", err)
		}

		log.Println("Received:", string(message))

		// Parse incoming message
		var resp map[string]interface{}
		if err := json.Unmarshal(message, &resp); err != nil {
			log.Println("Invalid JSON:", err)
			continue
		}

		if u, ok := resp["user"].(string); ok {
			opponentName = u
			err = conn.WriteJSON(map[string]string{
				"action": "accept",
			})
			if err != nil {
				return "", "", fmt.Errorf("write error: %v", err)
			}
			log.Println("Sent: accept")
		}

		// 🎯 Check for battle start or rejection
		if action, ok := resp["action"].(string); ok {
			if action == "battle_begin" {
				if battleID, ok := resp["battleId"].(string); ok {
					log.Println("Battle started:", battleID)
					return battleID, opponentName, nil
				}
				return "", "", fmt.Errorf("battle_begin received but battleId missing")
			} else if action == "match_rejected" {
				log.Println("Match rejected by opponent. Bot self-terminating.")
				return "", "", fmt.Errorf("match rejected by opponent")
			}
		}
	}
}
