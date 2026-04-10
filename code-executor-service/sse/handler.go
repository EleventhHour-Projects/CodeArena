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
	token := r.URL.Query().Get("token")

	if userId == "" || token == "" {
		http.Error(w, "userId and token are required", http.StatusBadRequest)
		return
	}

	if !utils.TokenStoreInstance.VerifySseToken(token, userId) {
		http.Error(w, "Invalid or expired SSE token", http.StatusUnauthorized)
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	ticker := time.NewTicker(5 * time.Second)
	refreshTicker := time.NewTicker(2 * time.Minute) // Refresh friend list every 2 minutes
	defer ticker.Stop()
	defer refreshTicker.Stop()
	defer utils.OnlineUser.Remove(userId)
	utils.OnlineUser.Add(userId)

	friends, err := database.MongoDB.ListFriends(userId)
	if err != nil {
		http.Error(w, "Failed to fetch friends", http.StatusInternalServerError)
		return
	}

	ctx := r.Context()

	for {
		select {
		case <-ctx.Done():
			return

		case <-refreshTicker.C:
			newFriends, err := database.MongoDB.ListFriends(userId)
			if err == nil {
				friends = newFriends
			}

		case <-ticker.C:
			onlineFriends := utils.OnlineUser.IsOnline(friends)
			data, err := json.Marshal(onlineFriends)
			if err != nil {
				fmt.Fprintf(w, "event: error\ndata: {\"message\":\"failed to marshal friends\"}\n\n")
				flusher.Flush()
				continue
			}
			fmt.Fprintf(w, "event: friends_update\n")
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		}
	}
}

func InviteHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	userId := r.URL.Query().Get("userId")
	token := r.URL.Query().Get("token")

	if userId == "" || token == "" {
		http.Error(w, "userId and token are required", http.StatusBadRequest)
		return
	}

	if !utils.TokenStoreInstance.VerifyInviteSseToken(token, userId) {
		http.Error(w, "Invalid or expired SSE token", http.StatusUnauthorized)
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			invites, ok := utils.InviteStore.GetInvite(userId)
			if !ok {
				invites = []utils.Invite{}
			}
			data, err := json.Marshal(invites)
			if err != nil {
				fmt.Fprintf(w, "event: error\ndata: {\"message\":\"failed to marshal invites\"}\n\n")
				flusher.Flush()
				continue
			}
			fmt.Fprintf(w, "event: invite_update\n")
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		}
	}
}
