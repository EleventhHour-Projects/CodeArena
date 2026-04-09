package utils

import (
	"sync"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type Friend struct {
	ID     bson.ObjectID `bson:"_id"`
	User   bson.ObjectID `bson:"user"`
	Friend bson.ObjectID `bson:"friend"`
}

type OnlineUsers struct {
	User map[string]bool
	mu   sync.RWMutex
}

var OnlineUser = &OnlineUsers{
	User: make(map[string]bool),
	mu:   sync.RWMutex{},
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
	o.mu.RLock()
	defer o.mu.RUnlock()
	var onlineUsers []string
	for _, id := range userID {
		if o.User[id] {
			onlineUsers = append(onlineUsers, id)
		}
	}
	return onlineUsers
}
