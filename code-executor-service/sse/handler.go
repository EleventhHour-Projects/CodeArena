package sse

import (
	"encoding/json"
	"executor-service/database"
	"executor-service/utils"
	"fmt"
	"net/http"
	"time"
)

func FriendHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	userId := r.URL.Query().Get("userId")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	defer utils.OnlineUser.Remove(userId)
	utils.OnlineUser.Add(userId)
	ctx := r.Context()

	for {
		select {
		case <-ctx.Done():
			return

		case <-ticker.C:
			friends, err := database.MongoDB.ListFriends(userId)
			if err != nil {
				fmt.Fprintf(w, "event: error\ndata: {\"message\":\"failed to fetch friends\"}\n\n")
				flusher.Flush()
				continue
			}
			onlineFriends := utils.OnlineUser.IsOnline(friends)
			data, _ := json.Marshal(onlineFriends)
			fmt.Fprintf(w, "event: friends_update\n")
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		}
	}
}
