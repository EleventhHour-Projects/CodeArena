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

func (o *OnlineUsers) IsOnline(userID []string) []string {
	o.mu.RLock()
	defer o.mu.RUnlock()
	onlineUsers := []string{}
	for _, id := range userID {
		if o.User[id] > 0 {
			onlineUsers = append(onlineUsers, id)
		}
	}
	return onlineUsers
}
