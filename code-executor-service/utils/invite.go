package utils

import (
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type Invite struct {
	Player1ID  bson.ObjectID `bson:"player1" json:"-"`
	Player1    *User         `bson:"-" json:"player1"`
	Player2    bson.ObjectID `bson:"player2" json:"player2"`
	Status     string        `bson:"status" json:"status"` // Pending, Accepted, Rejected
	ID         bson.ObjectID `bson:"_id" json:"_id"`
	CreatedAt  time.Time     `bson:"createdAt" json:"createdAt"`
	Difficulty string        `bson:"difficulty" json:"difficulty"`
	ExpiresAt  time.Time     `bson:"expiresAt" json:"expiresAt"`
}

type Invitation struct {
	Invites map[string][]Invite
	mu      sync.RWMutex
}

func (i *Invitation) AddInvite(invite []Invite) {
	i.mu.Lock()
	defer i.mu.Unlock()
	for _, inv := range invite {
		i.Invites[inv.Player2.Hex()] = append(i.Invites[inv.Player2.Hex()], inv)
	}
}

func (i *Invitation) RemoveInvite(player2ID string, inviteID string) {
	i.mu.Lock()
	defer i.mu.Unlock()
	if inviteID == "" {
		delete(i.Invites, player2ID)
		return
	}
	invites, exists := i.Invites[player2ID]
	if !exists {
		return
	}
	newInvites := make([]Invite, 0, len(invites))
	for _, inv := range invites {
		if inv.ID.Hex() != inviteID {
			newInvites = append(newInvites, inv)
		}
	}
	if len(newInvites) == 0 {
		delete(i.Invites, player2ID)
	} else {
		i.Invites[player2ID] = newInvites
	}
}

func (i *Invitation) GetInvite(player2ID string) ([]Invite, bool) {
	i.mu.RLock()
	defer i.mu.RUnlock()
	invite, exists := i.Invites[player2ID]
	return invite, exists
}

var InviteStore = &Invitation{
	Invites: make(map[string][]Invite),
	mu:      sync.RWMutex{},
}
