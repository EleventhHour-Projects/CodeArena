package utils

import (
	"sync"

	"go.mongodb.org/mongo-driver/v2/bson"
)

const (
	EVENTTYPERUN        = "EVENTRUN"
	EVENTTYPESUBMIT     = "EVENTSUBMIT"
	EVENTTYPERUNPASS    = "EVENTRUNPASS"
	EVENTTYPERUNFAIL    = "EVENTRUNFAIL"
	EVENTTYPESUBMITFAIL = "EVENTSUBMITFAIL"
	EVENTTYPESUBMITPASS = "EVENTSUBMITPASS"
)

type EVENTTYPE string

type WSSPayload struct {
	UserID       bson.ObjectID  `bson:"userID"`
	BattleID     bson.ObjectID  `bson:"BattleID"`
	SubmissionID *bson.ObjectID `bson:"submissionID"`
	Event        EVENTTYPE      `json:"event"`
}

type WSS struct {
	channel chan WSSPayload
	mu      sync.Mutex
}

var WSServer = &WSS{channel: make(chan WSSPayload), mu: sync.Mutex{}}

func (w *WSS) Add(payload WSSPayload) {
	w.channel <- payload
}

func (w *WSS) Get() WSSPayload {
	return <-w.channel
}
