package websocket

import (
	"bytes"
	"context"
	"encoding/json"
	"executor-service/utils"
	"fmt"
	"net/http"
	"time"
)

var wssClient = &http.Client{
	Timeout: 5 * time.Second,
	Transport: &http.Transport{
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 100,
		IdleConnTimeout:     90 * time.Second,
	},
}

// sendToWSS sends a payload to the WebSocket server by making an HTTP POST request to the specified WebSocket endpoint.
func sendToWSS(ctx context.Context, payload utils.WSSPayload) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, utils.WSSIP, bytes.NewBuffer(body))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-internal-key", utils.INTERNAL_KEY)

	resp, err := wssClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("unexpected status: %s", resp.Status)
	}

	return nil
}

// ListForEvents continuously listens for incoming payloads from the WebSocket channel and sends them to the WebSocket server.
func ListForEvents(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
			payload := utils.WSServer.Get()
			if err := sendToWSS(ctx, payload); err != nil {
				fmt.Println("Error sending event to TS server:", err)
			}
		}
	}
}
