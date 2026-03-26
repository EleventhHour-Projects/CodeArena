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
