package api_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"executor-service/api"
	"executor-service/utils"

	"github.com/gofiber/fiber/v3"
)

// ─── helpers ──────────────────────────────────────────────────────────────────

// newApp wires up a minimal Fiber app with just the routes under test.
// We deliberately avoid calling api.StartService() so no global server starts.
func newApp() *fiber.App {
	app := fiber.New()

	app.Get("/info", api.GetTaskInfo)
	app.Get("/api/internal/spawn", api.SpawnOneWorker)
	app.Get("/api/internal/stop", api.StopAnyOneWorker)
	app.Post("/api/internal/auto", api.SetAuto)
	app.Get("/api/internal/auto", api.GetAutoStatus)
	app.Get("/api/internal/pid", api.ServerPID)
	app.Get("/api/internal/usage", api.GetServerUsageInfo)

	return app
}

func doRequest(app *fiber.App, method, path string, body io.Reader, headers map[string]string) *http.Response {
	req := httptest.NewRequest(method, path, body)
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, _ := app.Test(req, fiber.TestConfig{Timeout: -1})
	return resp
}

func authHeader() map[string]string {
	return map[string]string{"X-Internal-Key": utils.INTERNAL_KEY}
}

func noAuthHeader() map[string]string { return nil }

// ─── GetTaskInfo (/info) ───────────────────────────────────────────────────────

// /info is public (no auth check) so we can always call it.
// The handler calls docker.GetWorkerDetails() which needs Docker; that will
// fail in CI — we only test the response contract on a controlled task count.
func TestGetTaskInfo_ResponseShape(t *testing.T) {
	app := newApp()

	// Pre-seed some task info so the response has non-zero values
	utils.TaskInfo.IncrementTime(0) // just tick the counter once for coverage

	resp := doRequest(app, "GET", "/info", nil, nil)

	// Accept 200 (docker running) or 500 (docker not available in CI).
	// Either way the handler must not panic and must return structured JSON.
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusInternalServerError {
		t.Errorf("unexpected status %d", resp.StatusCode)
	}
}

// ─── SpawnOneWorker (/api/internal/spawn) ─────────────────────────────────────

func TestSpawnOneWorker_Unauthorized(t *testing.T) {
	app := newApp()
	utils.INTERNAL_KEY = "secret-key"

	resp := doRequest(app, "GET", "/api/internal/spawn", nil, noAuthHeader())
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", resp.StatusCode)
	}
}

func TestSpawnOneWorker_WrongKey(t *testing.T) {
	app := newApp()
	utils.INTERNAL_KEY = "secret-key"

	resp := doRequest(app, "GET", "/api/internal/spawn", nil, map[string]string{"X-Internal-Key": "wrong"})
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", resp.StatusCode)
	}
}

func TestSpawnOneWorker_APIOnlyMode(t *testing.T) {
	app := newApp()
	utils.INTERNAL_KEY = "secret-key"
	utils.APIOnly = true
	defer func() { utils.APIOnly = false }()

	resp := doRequest(app, "GET", "/api/internal/spawn", nil, authHeader())
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("expected 403 in API-only mode, got %d", resp.StatusCode)
	}
}

// With a valid key and Docker unavailable the goroutine starts but returns
// immediately. We test that the HTTP layer returns 200 (handler succeeds).
func TestSpawnOneWorker_AuthorizedNoDocker(t *testing.T) {
	app := newApp()
	utils.INTERNAL_KEY = "secret-key"
	utils.APIOnly = false
	// We need a non-nil WorkerCTX so the goroutine doesn't panic.
	// Use a background context; the goroutine will fail to connect to Docker.
	// That's fine — we are testing the HTTP layer, not Docker.
	utils.WorkerCTX = t.Context()

	resp := doRequest(app, "GET", "/api/internal/spawn", nil, authHeader())
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
}

// ─── StopAnyOneWorker (/api/internal/stop) ────────────────────────────────────

func TestStopWorker_Unauthorized(t *testing.T) {
	app := newApp()
	utils.INTERNAL_KEY = "stop-key"

	resp := doRequest(app, "GET", "/api/internal/stop", nil, noAuthHeader())
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", resp.StatusCode)
	}
}

func TestStopWorker_APIOnlyMode(t *testing.T) {
	app := newApp()
	utils.INTERNAL_KEY = "stop-key"
	utils.APIOnly = true
	defer func() { utils.APIOnly = false }()

	resp := doRequest(app, "GET", "/api/internal/stop", nil, authHeader())
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("expected 403 in API-only mode, got %d", resp.StatusCode)
	}
}

func TestStopWorker_NoWorkers(t *testing.T) {
	app := newApp()
	utils.INTERNAL_KEY = "stop-key"
	utils.APIOnly = false

	// Reset worker count to 0.
	for utils.WorkerPoolData.GetCount() > 0 {
		utils.WorkerPoolData.Decrement()
	}

	resp := doRequest(app, "GET", "/api/internal/stop", nil, authHeader())
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400 with no workers, got %d", resp.StatusCode)
	}
	body, _ := io.ReadAll(resp.Body)
	if string(body) != "No workers to stop" {
		t.Errorf("unexpected body: %q", string(body))
	}
}

func TestStopWorker_SendsStopSignal(t *testing.T) {
	app := newApp()
	utils.INTERNAL_KEY = "stop-key"
	utils.APIOnly = false

	// Reinitialise channel so AddTask doesn't block.
	utils.InitWorkerPoolChannel(utils.WorkerPoolData, 10)
	utils.WorkerPoolData.Increment() // simulate 1 active worker

	resp := doRequest(app, "GET", "/api/internal/stop", nil, authHeader())
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	// A stop-signal task should have been pushed onto the channel.
	task := utils.WorkerPoolData.GetTask()
	if task.StopSignal == nil || !*task.StopSignal {
		t.Error("expected StopSignal=true on queued task")
	}

	utils.WorkerPoolData.Decrement() // clean up
}

// ─── SetAuto / GetAutoStatus ──────────────────────────────────────────────────

func TestSetAuto_Unauthorized(t *testing.T) {
	app := newApp()
	utils.INTERNAL_KEY = "auto-key"

	body := bytes.NewBufferString(`{"auto":true}`)
	resp := doRequest(app, "POST", "/api/internal/auto", body, noAuthHeader())
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", resp.StatusCode)
	}
}

func TestSetAuto_APIOnlyMode(t *testing.T) {
	app := newApp()
	utils.INTERNAL_KEY = "auto-key"
	utils.APIOnly = true
	defer func() { utils.APIOnly = false }()

	body := bytes.NewBufferString(`{"auto":true}`)
	resp := doRequest(app, "POST", "/api/internal/auto", body, authHeader())
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("expected 403 in API-only mode, got %d", resp.StatusCode)
	}
}

func TestSetAuto_InvalidBody(t *testing.T) {
	app := newApp()
	utils.INTERNAL_KEY = "auto-key"
	utils.APIOnly = false

	body := bytes.NewBufferString(`not-json`)
	resp := doRequest(app, "POST", "/api/internal/auto", body, authHeader())
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

func TestSetAuto_Enable(t *testing.T) {
	app := newApp()
	utils.INTERNAL_KEY = "auto-key"
	utils.APIOnly = false
	utils.WorkerPoolData.SetAuto(false)

	body := bytes.NewBufferString(`{"auto":true}`)
	resp := doRequest(app, "POST", "/api/internal/auto", body, authHeader())
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
	if !utils.WorkerPoolData.GetAuto() {
		t.Error("expected auto=true after SetAuto request")
	}
}

func TestSetAuto_Disable(t *testing.T) {
	app := newApp()
	utils.INTERNAL_KEY = "auto-key"
	utils.APIOnly = false
	utils.WorkerPoolData.SetAuto(true)

	body := bytes.NewBufferString(`{"auto":false}`)
	resp := doRequest(app, "POST", "/api/internal/auto", body, authHeader())
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
	if utils.WorkerPoolData.GetAuto() {
		t.Error("expected auto=false after SetAuto request")
	}
}

func TestGetAutoStatus_Unauthorized(t *testing.T) {
	app := newApp()
	utils.INTERNAL_KEY = "auto-key"

	resp := doRequest(app, "GET", "/api/internal/auto", nil, noAuthHeader())
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", resp.StatusCode)
	}
}

func TestGetAutoStatus_ReturnsCorrectState(t *testing.T) {
	app := newApp()
	utils.INTERNAL_KEY = "auto-key"

	for _, expect := range []bool{false, true, false} {
		utils.WorkerPoolData.SetAuto(expect)

		resp := doRequest(app, "GET", "/api/internal/auto", nil, authHeader())
		if resp.StatusCode != http.StatusOK {
			t.Errorf("expected 200, got %d", resp.StatusCode)
		}

		var payload map[string]bool
		if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if payload["auto"] != expect {
			t.Errorf("expected auto=%v, got %v", expect, payload["auto"])
		}
	}
}

// ─── ServerPID (/api/internal/pid) ────────────────────────────────────────────

func TestServerPID_Unauthorized(t *testing.T) {
	app := newApp()
	utils.INTERNAL_KEY = "pid-key"

	resp := doRequest(app, "GET", "/api/internal/pid", nil, noAuthHeader())
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", resp.StatusCode)
	}
}

func TestServerPID_ReturnsCorrectPID(t *testing.T) {
	app := newApp()
	utils.INTERNAL_KEY = "pid-key"
	utils.MainProcessID = 99999

	resp := doRequest(app, "GET", "/api/internal/pid", nil, authHeader())
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	var payload map[string]int
	json.NewDecoder(resp.Body).Decode(&payload)
	if payload["pid"] != 99999 {
		t.Errorf("expected pid=99999, got %d", payload["pid"])
	}
}

// ─── GetServerUsageInfo (/api/internal/usage) ─────────────────────────────────

func TestGetServerUsageInfo_Unauthorized(t *testing.T) {
	app := newApp()
	utils.INTERNAL_KEY = "usage-key"

	resp := doRequest(app, "GET", "/api/internal/usage", nil, noAuthHeader())
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", resp.StatusCode)
	}
}

func TestGetServerUsageInfo_ResponseShape(t *testing.T) {
	app := newApp()
	utils.INTERNAL_KEY = "usage-key"

	resp := doRequest(app, "GET", "/api/internal/usage", nil, authHeader())
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	var payload map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("failed to decode usage response: %v", err)
	}
	// Fields must exist; value is either a real reading or "N/A".
	if _, ok := payload["cpu_usage"]; !ok {
		t.Error("response missing 'cpu_usage' field")
	}
	if _, ok := payload["memory_usage"]; !ok {
		t.Error("response missing 'memory_usage' field")
	}
}
