package utils

import (
	"sync"

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
)

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
