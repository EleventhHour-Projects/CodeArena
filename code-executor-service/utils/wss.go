package utils

import (
	"sync"

	"go.mongodb.org/mongo-driver/v2/bson"
)

// ENUMs for WebSocket event types, representing different events that can occur during the code execution process, such as running code, submitting code, and the outcomes of these actions (pass or fail)
const (
	EVENTTYPERUN        = "EVENTRUN"
	EVENTTYPESUBMIT     = "EVENTSUBMIT"
	EVENTTYPERUNPASS    = "EVENTRUNPASS"
	EVENTTYPERUNFAIL    = "EVENTRUNFAIL"
	EVENTTYPESUBMITFAIL = "EVENTSUBMITFAIL"
	EVENTTYPESUBMITPASS = "EVENTSUBMITPASS"
)

// EVENTTYPE is a custom type representing the different types of events that can occur in the WebSocket communication for the code execution service, allowing for clear and consistent handling of various events related to code execution and submission outcomes.
type EVENTTYPE string

// WSSPayload represents the structure of the payload sent through the WebSocket channel, containing information about the user, battle, submission, and the type of event that occurred during the code execution process, allowing for efficient communication of relevant data between different components of the code execution service.
type WSSPayload struct {
	UserID       bson.ObjectID  `bson:"userID" json:"userId"`
	BattleID     bson.ObjectID  `bson:"BattleID" json:"battleId"`
	SubmissionID *bson.ObjectID `bson:"submissionID" json:"submissionId"`
	ProblemID    int            `json:"problemId"`
	Event        EVENTTYPE      `json:"event"`
}

// WSS is a struct that encapsulates a channel for WebSocket communication, allowing for thread-safe addition and retrieval of payload
type WSS struct {
	// channel is a Go channel that holds WSSPayloads, enabling communication of events related to code execution
	// and submission outcomes between different components of the code execution service in a thread-safe manner
	channel chan WSSPayload
	// mu is a mutex to ensure thread-safe access to the WebSocket channel, allowing for concurrent addition and retrieval of payload
	mu sync.Mutex
}

// WSServer is a global variable that holds an instance of the WSS struct, providing a centralized point of access for WebSocket communication throughout the application, allowing for efficient handling of events related to code execution and submission outcomes in a thread-safe manner.
var WSServer = &WSS{channel: make(chan WSSPayload), mu: sync.Mutex{}}

// Add adds a new payload to the WebSocket channel in a thread-safe manner, allowing for efficient communication of events related to code execution and submission outcomes between different components of the code execution service.
func (w *WSS) Add(payload WSSPayload) {
	w.channel <- payload
}

// Get retrieves a payload from the WebSocket channel in a thread-safe manner, allowing for efficient handling of events related to code execution and submission outcomes by different components of the code execution service.
func (w *WSS) Get() WSSPayload {
	return <-w.channel
}
