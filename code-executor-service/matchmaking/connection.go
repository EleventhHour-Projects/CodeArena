package matchmaking

import (
	"context"
	"executor-service/database"
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

func handler(w http.ResponseWriter, r *http.Request) {
	tkn := r.URL.Query().Get("token")
	username := r.URL.Query().Get("username")

	if tkn == "" || username == "" {
		http.Error(w, "Token and username required", http.StatusBadRequest)
		return
	}

	if !utils.TokenStoreInstance.VerifyToken(tkn, username) {
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

	utils.ConnectionPoolInstance.AddConnection(tkn, conn)
	utils.UserPoolInstance.AddUser(&utils.User{
		ID:            user.ID,
		Username:      user.Username,
		AllotedConnID: tkn,
		Rating:        user.Rating,
		Email:         user.Email,
		Name:          user.Name,
	})
	timeout := 5 * time.Minute
	conn.SetReadDeadline(time.Now().Add(timeout))
	for {
		_, _, err := conn.ReadMessage()
		if !utils.ConnectionPoolInstance.ConnExists(tkn) {
			break
		}
		if err != nil {
			break
		}
		time.Sleep(time.Millisecond * 1000)
	}
	defer func() {
		utils.ConnectionPoolInstance.RemoveConnection(tkn)
		utils.UserPoolInstance.RemoveUser(tkn)
		conn.Close()
	}()
}

func MatchmakingService(ctx context.Context) {
	port := "6970"
	http.HandleFunc("/wss/matchmaking", handler)
	fmt.Println("Server running on port:", port)
	err := http.ListenAndServe(":"+port, nil)
	if err != nil {
		fmt.Println("Server failed:", err)
	}
}

type notification struct {
	User   string `json:"user"`
	Rating int    `json:"rating"`
}

func NotifyUser(user1 *utils.User, user2 *utils.User) {
	conn1, ok1 := utils.ConnectionPoolInstance.GetConnection(user1.AllotedConnID)
	conn2, ok2 := utils.ConnectionPoolInstance.GetConnection(user2.AllotedConnID)

	if !ok1 || !ok2 {
		fmt.Println("One or both connections not found for users:", user1.Username, user2.Username)
		return
	}

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
	defer func() {
		conn1.Close()
		conn2.Close()
		utils.ConnectionPoolInstance.RemoveConnection(user1.AllotedConnID)
		utils.UserPoolInstance.RemoveUser(user1.AllotedConnID)
		utils.ConnectionPoolInstance.RemoveConnection(user2.AllotedConnID)
		utils.UserPoolInstance.RemoveUser(user2.AllotedConnID)
	}()
}
