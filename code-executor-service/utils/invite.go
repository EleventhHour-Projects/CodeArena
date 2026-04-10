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
	// Reset the map to reflect current DB state (avoiding duplicates)
	i.Invites = make(map[string][]Invite)
	for _, inv := range invite {
		inviteID := inv.ID.Hex()
		
		// Helper to add unique invite to a user's bucket
		addUnique := func(userID string) {
			if userID == "" {
				return
			}
			existing := i.Invites[userID]
			isDup := false
			for _, e := range existing {
				if e.ID.Hex() == inviteID {
					isDup = true
					break
				}
			}
			if !isDup {
				i.Invites[userID] = append(i.Invites[userID], inv)
			}
		}

		// Index by receiver (Player2)
		addUnique(inv.Player2.Hex())
		// Index by sender (Player1)
		addUnique(inv.Player1ID.Hex())
	}
}

func (i *Invitation) RemoveInvite(inviteID string) {
	i.mu.Lock()
	defer i.mu.Unlock()
	for userID, invites := range i.Invites {
		changed := false
		newInvites := make([]Invite, 0, len(invites))
		for _, inv := range invites {
			if inv.ID.Hex() == inviteID {
				changed = true
				continue
			}
			newInvites = append(newInvites, inv)
		}
		if changed {
			if len(newInvites) == 0 {
				delete(i.Invites, userID)
			} else {
				i.Invites[userID] = newInvites
			}
		}
	}
}

func (i *Invitation) ClearAllForUser(userID string) {
	i.mu.Lock()
	defer i.mu.Unlock()
	delete(i.Invites, userID)
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
