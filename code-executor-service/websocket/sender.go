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

// sendToWSS sends a payload to the WebSocket server by making an HTTP POST request to the specified WebSocket endpoint, allowing for communication of events related to code execution and submission outcomes from the code execution service to the WebSocket server for real-time updates and notifications
// The function constructs the HTTP request with the appropriate headers and payload, and handles the response to ensure successful communication with the WebSocket server, providing error handling for any issues that may arise during the request process.
func sendToWSS(payload utils.WSSPayload) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest(http.MethodPost, utils.WSSIP, bytes.NewBuffer(body))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-internal-key", utils.INTERNAL_KEY)

	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("unexpected status: %s", resp.Status)
	}

	return nil
}

// ListForEvents continuously listens for incoming payloads from the WebSocket channel and sends them to the WebSocket server using the sendToWSS function, allowing for real-time communication of events related to code execution and submission outcomes from the code execution service to the WebSocket server
// The function runs in a loop, checking for cancellation of the context to gracefully exit when needed, and handles any errors that may occur during the sending of events to the WebSocket server, ensuring robust communication between the code execution service and the WebSocket server for real-time updates and notifications.
func ListForEvents(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
			payload := utils.WSServer.Get()
			err := sendToWSS(payload)
			if err != nil {
				fmt.Println("Error sending event to TS server:", err)
			}
		}
	}
}
