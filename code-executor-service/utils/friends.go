package utils

import (
	"sync"
	"os"
	"strings"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type Friend struct {
	ID     bson.ObjectID `bson:"_id"`
	User   bson.ObjectID `bson:"user"`
	Friend bson.ObjectID `bson:"friend"`
}

type FriendStatus struct {
	ID              string `json:"id"`
	CurrentBattleID string `json:"bid,omitempty"`
}

type OnlineUsers struct {
	User map[string]int
	mu   sync.RWMutex
}

var OnlineUser = &OnlineUsers{
	User: make(map[string]int),
	mu:   sync.RWMutex{},
}

func (o *OnlineUsers) Add(userID string) {
	o.mu.Lock()
	defer o.mu.Unlock()
	o.User[userID]++
}

func (o *OnlineUsers) Remove(userID string) {
	o.mu.Lock()
	defer o.mu.Unlock()
	if _, ok := o.User[userID]; ok {
		o.User[userID]--
		if o.User[userID] <= 0 {
			delete(o.User, userID)
		}
	}
}

func isBotUser(id string) bool {
	botPoolEnv := os.Getenv("BOT_POOL")
	if botPoolEnv == "" {
		botPoolEnv = "69de72c58961bbd5a5c37278" // fallback default bot
	}
	for _, b := range strings.Split(botPoolEnv, ",") {
		if strings.TrimSpace(b) == id {
			return true
		}
	}
	return false
}

func (o *OnlineUsers) IsOnline(userID []string) []string {
	o.mu.RLock()
	defer o.mu.RUnlock()
	onlineUsers := []string{}
	for _, id := range userID {
		if o.User[id] > 0 || isBotUser(id) {
			onlineUsers = append(onlineUsers, id)
		}
	}
	return onlineUsers
}

func (o *OnlineUsers) GetAllOnlineUsers() []string {
	o.mu.RLock()
	defer o.mu.RUnlock()
	onlineUsers := make([]string, 0, len(o.User))
	for id := range o.User {
		onlineUsers = append(onlineUsers, id)
	}
	return onlineUsers
}

func (o *OnlineUsers) GetOnlineFriendStatuses(friends []User) []FriendStatus {
	o.mu.RLock()
	defer o.mu.RUnlock()
	onlineFriends := []FriendStatus{}
	for _, f := range friends {
		idHex := f.ID.Hex()
		if o.User[idHex] > 0 || isBotUser(idHex) {
			bid := ""
			if !f.CurrentBattleID.IsZero() {
				bid = f.CurrentBattleID.Hex()
			}
			onlineFriends = append(onlineFriends, FriendStatus{
				ID:              idHex,
				CurrentBattleID: bid,
			})
		}
	}
	return onlineFriends
}
