package utils

import (
	"sync"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type Friend struct {
	ID     bson.ObjectID `json:"_id"`
	User   bson.ObjectID `json:"user"`
	Friend bson.ObjectID `json:"friend"`
}

type OnlineUsers struct {
	User map[string]bool
	mu   sync.Mutex
}

var OnlineUser = &OnlineUsers{
	User: make(map[string]bool),
	mu:   sync.Mutex{},
}

func (o *OnlineUsers) Add(userID string) {
	o.mu.Lock()
	defer o.mu.Unlock()
	o.User[userID] = true
}

func (o *OnlineUsers) Remove(userID string) {
	o.mu.Lock()
	defer o.mu.Unlock()
	delete(o.User, userID)
}

func (o *OnlineUsers) IsOnline(userID []string) []string {
	var onlineUsers []string
	for _, id := range userID {
		if o.User[id] {
			onlineUsers = append(onlineUsers, id)
		}
	}
	return onlineUsers
}
