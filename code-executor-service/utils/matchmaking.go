package utils

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// UserPool represents a pool of users waiting for matchmaking.
type UserPool struct {
	Users []*User
	// mu is a mutex to protect access to the Users slice,
	// ensuring thread-safe operations when adding, retrieving, or removing users.
	mu sync.Mutex
}

// Connection represents a pool of WebSocket connections.
type Connection struct {
	Pool map[string]*websocket.Conn
	// mu is a mutex to protect access to the Pool map,
	// ensuring thread-safe operations when adding, retrieving, or removing connections.
	mu sync.RWMutex
}

var (
	// UserPoolInstance is a singleton instance of UserPool that can be accessed globally.
	UserPoolInstance = &UserPool{
		Users: make([]*User, 0),
	}

	// ConnectionPoolInstance is a singleton instance of Connection that can be accessed globally.
	ConnectionPoolInstance = &Connection{
		Pool: make(map[string]*websocket.Conn),
	}

	// MatchPoolInstance tracks active matches.
	MatchPoolInstance = &MatchPool{
		Matches: make(map[string]*Match),
	}

	// RejectionRegistryInstance tracks rejected matches for 5 minutes.
	RejectionRegistryInstance = &RejectionRegistry{
		Rejections: make(map[string]time.Time),
	}
)

type RejectionRegistry struct {
	Rejections map[string]time.Time
	mu         sync.RWMutex
}

func (rr *RejectionRegistry) AddRejection(u1, u2 string) {
	rr.mu.Lock()
	defer rr.mu.Unlock()
	key := rr.getRejectionKey(u1, u2)
	rr.Rejections[key] = time.Now().Add(5 * time.Minute)
}

func (rr *RejectionRegistry) IsRejected(u1, u2 string) bool {
	rr.mu.RLock()
	defer rr.mu.RUnlock()
	key := rr.getRejectionKey(u1, u2)
	expiry, exists := rr.Rejections[key]
	if !exists {
		return false
	}
	if time.Now().After(expiry) {
		return false
	}
	return true
}

func (rr *RejectionRegistry) getRejectionKey(u1, u2 string) string {
	if u1 < u2 {
		return u1 + ":" + u2
	}
	return u2 + ":" + u1
}

func (rr *RejectionRegistry) StartCleanup() {
	go func() {
		for {
			time.Sleep(1 * time.Minute)
			rr.mu.Lock()
			for k, v := range rr.Rejections {
				if time.Now().After(v) {
					delete(rr.Rejections, k)
				}
			}
			rr.mu.Unlock()
		}
	}()
}

type Match struct {
	User1      *User
	User2      *User
	Accepted1  bool
	Accepted2  bool
	MatchID    string
	Difficulty string
}

type MatchPool struct {
	Matches map[string]*Match
	mu      sync.RWMutex
}

func (mp *MatchPool) AddMatch(match *Match) {
	mp.mu.Lock()
	defer mp.mu.Unlock()
	mp.Matches[match.MatchID] = match
}

func (mp *MatchPool) GetMatch(id string) (*Match, bool) {
	mp.mu.RLock()
	defer mp.mu.RUnlock()
	m, exists := mp.Matches[id]
	return m, exists
}

func (mp *MatchPool) RemoveMatch(id string) {
	mp.mu.Lock()
	defer mp.mu.Unlock()
	delete(mp.Matches, id)
}

func (mp *MatchPool) GetMatchByConnID(connID string) (*Match, bool) {
	mp.mu.RLock()
	defer mp.mu.RUnlock()
	for _, m := range mp.Matches {
		if m.User1.AllotedConnID == connID || m.User2.AllotedConnID == connID {
			return m, true
		}
	}
	return nil, false
}

// AddConnection adds a new WebSocket connection to the pool with the given AllotedConnID.
// It locks the pool for writing, adds the connection to the pool, and then unlocks it.
func (cp *Connection) AddConnection(AllotedConnID string, conn *websocket.Conn) {
	cp.mu.Lock()
	defer cp.mu.Unlock()
	cp.Pool[AllotedConnID] = conn
}

// GetConnection retrieves a WebSocket connection from the pool using the given AllotedConnID.
// It returns the connection and a boolean indicating whether the connection exists.
func (cp *Connection) GetConnection(id string) (*websocket.Conn, bool) {
	cp.mu.RLock()
	defer cp.mu.RUnlock()
	conn, exists := cp.Pool[id]
	return conn, exists
}

// RemoveConnection removes a WebSocket connection from the pool using the given AllotedConnID.
// It locks the pool for writing, deletes the connection from the pool, and then unlocks it.
func (cp *Connection) RemoveConnection(AllotedConnID string) {
	cp.mu.Lock()
	defer cp.mu.Unlock()
	delete(cp.Pool, AllotedConnID)
}

// AddUser adds a new user to the UserPool.
// It locks the pool for writing, appends the user to the Users slice, and then unlocks it.
func (up *UserPool) AddUser(user *User) {
	up.mu.Lock()
	defer up.mu.Unlock()
	up.Users = append(up.Users, user)
}

// GetAllUsers retrieves all users from the UserPool.
// It locks the pool for reading, creates a copy of the Users slice, and then unlocks it.
// It returns the copy of the Users slice and the number of users in the pool.
func (up *UserPool) GetAllUsers() ([]*User, int) {
	up.mu.Lock()
	defer up.mu.Unlock()

	n := len(up.Users)
	if n == 0 {
		return nil, 0
	}

	usersCopy := make([]*User, n)
	copy(usersCopy, up.Users)

	return usersCopy, n
}

func (up *UserPool) GetUserByConnID(AllotedConnID string) (*User, bool) {
	up.mu.Lock()
	defer up.mu.Unlock()
	for _, user := range up.Users {
		if user.AllotedConnID == AllotedConnID {
			return user, true
		}
	}
	return nil, false
}

// RemoveUser removes a user from the UserPool based on the given AllotedConnID.
// It locks the pool for writing, iterates through the Users slice to find the user with the matching AllotedConnID,
// removes the user from the slice, and then unlocks it.
func (up *UserPool) RemoveUser(AllotedConnID string) {
	up.mu.Lock()
	defer up.mu.Unlock()
	for i, user := range up.Users {
		if user.AllotedConnID == AllotedConnID {
			up.Users = append(up.Users[:i], up.Users[i+1:]...)
			break
		}
	}
}

// ConnExists checks if a connection with the given AllotedConnID exists in the Connection pool.
// It locks the pool for reading, checks if the connection exists in the Pool map, and then unlocks it.
// It returns a boolean indicating whether the connection exists.
func (cp *Connection) ConnExists(AllotedConnID string) bool {
	cp.mu.RLock()
	defer cp.mu.RUnlock()
	_, exists := cp.Pool[AllotedConnID]
	return exists
}

func (cp *Connection) GetConnectionsSize() int {
	cp.mu.RLock()
	defer cp.mu.RUnlock()
	return len(cp.Pool)
}
