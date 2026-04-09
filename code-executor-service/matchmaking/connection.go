package matchmaking

import (
	"context"
	"executor-service/database"
	"executor-service/sse"
	"executor-service/utils"
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// handler is a function that handles the websocket connection for matchmaking
func handler(w http.ResponseWriter, r *http.Request) {
	tkn := r.URL.Query().Get("token")
	username := r.URL.Query().Get("username")

	if tkn == "" || username == "" {
		http.Error(w, "Token and username required", http.StatusBadRequest)
		return
	}

	difficulty, ok := utils.TokenStoreInstance.VerifyToken(tkn, username)
	if !ok {
		http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println(utils.Red+"Failed to upgrade connection:", err.Error()+utils.Reset)
		return
	}

	utils.TokenStoreInstance.ConsumeToken(tkn)

	user, err := database.MongoDB.GetUserByUsername(username)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}
	users, _ := utils.UserPoolInstance.GetAllUsers()
	for _, u := range users {
		if u.Username == username {
			if oldConn, exists := utils.ConnectionPoolInstance.GetConnection(u.AllotedConnID); exists {
				oldConn.Close()
				utils.ConnectionPoolInstance.RemoveConnection(u.AllotedConnID)
			}
			utils.UserPoolInstance.RemoveUser(u.AllotedConnID)
			break
		}
	}

	utils.ConnectionPoolInstance.AddConnection(tkn, conn)
	utils.UserPoolInstance.AddUser(&utils.User{
		ID:              user.ID,
		Username:        user.Username,
		AllotedConnID:   tkn,
		Rating:          user.Rating,
		Email:           user.Email,
		Name:            user.Name,
		Difficulty:      difficulty,
		CurrentBattleID: user.CurrentBattleID,
	})
	timeout := 10 * time.Minute
	conn.SetReadDeadline(time.Now().Add(timeout))
	for {
		var msg struct {
			Action string `json:"action"`
		}
		err := conn.ReadJSON(&msg)
		if err != nil {
			break
		}

		if msg.Action == "accept" {
			match, ok := utils.MatchPoolInstance.GetMatchByConnID(tkn)
			if ok {
				if match.User1.AllotedConnID == tkn {
					match.Accepted1 = true
				} else {
					match.Accepted2 = true
				}

				if match.Accepted1 && match.Accepted2 {
					// Both accepted, start battle
					battleObjectID, err := database.MongoDB.CreateBattle(match.User1.ID, match.User2.ID, match.Difficulty)
					if err != nil {
						fmt.Println("Error creating battle:", err)
						break
					}
					startMsg := map[string]interface{}{
						"action":   "battle_begin",
						"battleId": battleObjectID.Hex(),
					}

					conn1, ok1 := utils.ConnectionPoolInstance.GetConnection(match.User1.AllotedConnID)
					conn2, ok2 := utils.ConnectionPoolInstance.GetConnection(match.User2.AllotedConnID)

					if ok1 {
						conn1.WriteJSON(startMsg)
						conn1.Close()
					}
					if ok2 {
						conn2.WriteJSON(startMsg)
						conn2.Close()
					}

					// Cleanup
					utils.MatchPoolInstance.RemoveMatch(match.MatchID)
					utils.ConnectionPoolInstance.RemoveConnection(match.User1.AllotedConnID)
					utils.ConnectionPoolInstance.RemoveConnection(match.User2.AllotedConnID)
					utils.UserPoolInstance.RemoveUser(match.User1.AllotedConnID)
					utils.UserPoolInstance.RemoveUser(match.User2.AllotedConnID)
					break
				}
			}
		} else if msg.Action == "reject" {
			match, ok := utils.MatchPoolInstance.GetMatchByConnID(tkn)
			if ok {
				// Blacklist the pair for 5 minutes
				utils.RejectionRegistryInstance.AddRejection(match.User1.Username, match.User2.Username)

				// Notify both users that match was rejected and return them to pool
				rejectMsg := map[string]interface{}{
					"action": "match_rejected",
				}

				conn1, ok1 := utils.ConnectionPoolInstance.GetConnection(match.User1.AllotedConnID)
				conn2, ok2 := utils.ConnectionPoolInstance.GetConnection(match.User2.AllotedConnID)

				if ok1 {
					conn1.WriteJSON(rejectMsg)
				}
				if ok2 {
					conn2.WriteJSON(rejectMsg)
				}

				// Cleanup match but keep users in pool (they will be re-matched later)
				utils.MatchPoolInstance.RemoveMatch(match.MatchID)
			}
		}
	}
	defer func() {
		utils.ConnectionPoolInstance.RemoveConnection(tkn)
		utils.UserPoolInstance.RemoveUser(tkn)
		conn.Close()
	}()
}

// MatchmakingService is a function that starts the matchmaking service
func MatchmakingService(ctx context.Context) {
	port := "6970"
	http.HandleFunc("/wss/matchmaking", handler)
	http.HandleFunc("/sse/friends", sse.FriendHandler)
	fmt.Println("Server running on port:", port)
	err := http.ListenAndServe(":"+port, nil)
	if err != nil {
		fmt.Println("Server failed:", err)
	}
}

// notification is a struct that is used to send notifications to users
type notification struct {
	User   string `json:"user"`
	Rating int    `json:"rating"`
}

// NotifyUser is a function that sends notifications to users about the match
func NotifyUser(user1 *utils.User, user2 *utils.User) {
	conn1, ok1 := utils.ConnectionPoolInstance.GetConnection(user1.AllotedConnID)
	conn2, ok2 := utils.ConnectionPoolInstance.GetConnection(user2.AllotedConnID)

	if !ok1 || !ok2 {
		fmt.Println("One or both connections not found for users:", user1.Username, user2.Username)
		return
	}

	matchID := "match_" + utils.RandomString(16)
	utils.MatchPoolInstance.AddMatch(&utils.Match{
		User1:      user1,
		User2:      user2,
		MatchID:    matchID,
		Difficulty: user1.Difficulty,
	})

	var matchInfo1 notification
	matchInfo1.User = user2.Username
	matchInfo1.Rating = user2.Rating
	err := conn1.WriteJSON(matchInfo1)
	if err != nil {
		fmt.Println("Failed to send message to", user1.Username, ":", err)
	}

	var matchInfo2 notification
	matchInfo2.User = user1.Username
	matchInfo2.Rating = user1.Rating
	err = conn2.WriteJSON(matchInfo2)
	if err != nil {
		fmt.Println("Failed to send message to", user2.Username, ":", err)
	}
}
