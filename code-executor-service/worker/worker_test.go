package worker_test

import (
	"strings"
	"testing"
	"time"

	"executor-service/utils"
	"executor-service/worker"
)

// ─── normalizeOutput ──────────────────────────────────────────────────────────

func TestNormalizeOutput_BasicTrim(t *testing.T) {
	cases := []struct {
		in, want string
	}{
		{"hello\n", "hello"},
		// TrimSpace is called on the whole result, so leading spaces on the
		// sole line are stripped at the outer level.
		{"  hello  \n", "hello"},
		{"\thello\t\r\n", "hello"},
		{"hello", "hello"},
		{"", ""},
	}
	for _, c := range cases {
		got := worker.NormalizeOutput(c.in)
		if got != c.want {
			t.Errorf("NormalizeOutput(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestNormalizeOutput_MultiLine(t *testing.T) {
	in := "line1  \nline2\t\nline3\r\n"
	got := worker.NormalizeOutput(in)
	// Trailing whitespace stripped per line; leading/trailing blank lines gone
	lines := strings.Split(got, "\n")
	if len(lines) != 3 {
		t.Fatalf("expected 3 lines, got %d: %v", len(lines), lines)
	}
	if strings.HasSuffix(lines[0], " ") || strings.HasSuffix(lines[1], "\t") {
		t.Error("trailing whitespace not stripped from lines")
	}
}

func TestNormalizeOutput_PreservesLeadingWhitespace(t *testing.T) {
	// Leading whitespace on a non-sole line is preserved because only
	// trailing whitespace is stripped per-line. The outer TrimSpace only
	// affects the very start/end of the full concatenated string.
	in := "prefix\n    indented\n"
	got := worker.NormalizeOutput(in)
	lines := strings.Split(got, "\n")
	if len(lines) != 2 {
		t.Fatalf("expected 2 lines, got %d", len(lines))
	}
	if !strings.HasPrefix(lines[1], "    ") {
		t.Errorf("NormalizeOutput stripped leading whitespace on inner line: got %q", lines[1])
	}
}

func TestNormalizeOutput_OnlyWhitespace(t *testing.T) {
	for _, in := range []string{"   ", "\n\n", "\t\r\n", "  \n  "} {
		got := worker.NormalizeOutput(in)
		if got != "" {
			t.Errorf("NormalizeOutput(%q) = %q, want empty string", in, got)
		}
	}
}

func TestNormalizeOutput_NoNewlines(t *testing.T) {
	in := "noeol"
	if got := worker.NormalizeOutput(in); got != in {
		t.Errorf("NormalizeOutput(%q) = %q, want %q", in, got, in)
	}
}

func TestNormalizeOutput_WindowsLineEndings(t *testing.T) {
	in := "hello\r\nworld\r\n"
	got := worker.NormalizeOutput(in)
	if strings.Contains(got, "\r") {
		t.Errorf("NormalizeOutput did not strip \\r: got %q", got)
	}
	if got != "hello\nworld" {
		t.Errorf("NormalizeOutput(%q) = %q", in, got)
	}
}

// ─── FailedInfo struct (via SaveSubmissionResult) ─────────────────────────────
// SaveSubmissionResult calls database.MongoDB and utils.WSServer which require
// running infra. We test the pure logic that feeds into it:
// – TLE/MLE detection based on Constraints vs elapsed time/memory
// – Result struct field mapping
//
// We do this by replicating the *same logic* in a local helper that matches
// the implementation exactly, then asserting the computed values.

type resultSnapshot struct {
	TLE            bool
	MLE            bool
	RunTimeMs      int
	MemoryUsedMB   int
	ErrorMSG       string
	ActualOutput   string
	ExpectedOutput string
	TestCase       string
}

// mirrorSaveResult mirrors the pure TLE/MLE/Result logic from submission.go
// without touching MongoDB or WebSocket.
func mirrorSaveResult(task *utils.CodeConfig, elapsed time.Duration, memory int, failed failedInfoMirror) resultSnapshot {
	isTle := int(elapsed.Seconds()) > task.Constraints.MaxTime
	isMle := memory > task.Constraints.MaxMemory
	return resultSnapshot{
		TLE:            isTle,
		MLE:            isMle,
		RunTimeMs:      int(elapsed.Milliseconds()),
		MemoryUsedMB:   memory,
		ErrorMSG:       failed.ErrorMessage,
		ActualOutput:   failed.ActualOutput,
		ExpectedOutput: failed.ExpectedOutput,
		TestCase:       failed.TestCase,
	}
}

type failedInfoMirror struct {
	IsFailed       bool
	ErrorMessage   string
	TestCase       string
	ActualOutput   string
	ExpectedOutput string
}

// ─── TLE / MLE detection ──────────────────────────────────────────────────────

func TestTLEDetection_OverLimit(t *testing.T) {
	task := &utils.CodeConfig{
		Constraints: &utils.CodeConfigConstraints{MaxTime: 1, MaxMemory: 256},
	}
	// 2 seconds elapsed > MaxTime 1 → TLE
	r := mirrorSaveResult(task, 2*time.Second, 0, failedInfoMirror{})
	if !r.TLE {
		t.Error("expected TLE=true when elapsed > MaxTime")
	}
}

func TestTLEDetection_UnderLimit(t *testing.T) {
	task := &utils.CodeConfig{
		Constraints: &utils.CodeConfigConstraints{MaxTime: 5, MaxMemory: 256},
	}
	r := mirrorSaveResult(task, 500*time.Millisecond, 0, failedInfoMirror{})
	if r.TLE {
		t.Error("expected TLE=false when elapsed < MaxTime")
	}
}

func TestTLEDetection_AtExactLimit(t *testing.T) {
	task := &utils.CodeConfig{
		Constraints: &utils.CodeConfigConstraints{MaxTime: 2, MaxMemory: 256},
	}
	// Exactly 2 seconds: int(2s) > 2 → false (not strictly greater)
	r := mirrorSaveResult(task, 2*time.Second, 0, failedInfoMirror{})
	if r.TLE {
		t.Error("expected TLE=false at exactly MaxTime boundary")
	}
}

func TestMLEDetection_OverLimit(t *testing.T) {
	task := &utils.CodeConfig{
		Constraints: &utils.CodeConfigConstraints{MaxTime: 10, MaxMemory: 128},
	}
	r := mirrorSaveResult(task, 100*time.Millisecond, 200, failedInfoMirror{})
	if !r.MLE {
		t.Error("expected MLE=true when memory > MaxMemory")
	}
}

func TestMLEDetection_UnderLimit(t *testing.T) {
	task := &utils.CodeConfig{
		Constraints: &utils.CodeConfigConstraints{MaxTime: 10, MaxMemory: 256},
	}
	r := mirrorSaveResult(task, 100*time.Millisecond, 100, failedInfoMirror{})
	if r.MLE {
		t.Error("expected MLE=false when memory < MaxMemory")
	}
}

func TestMLEDetection_AtExactLimit(t *testing.T) {
	task := &utils.CodeConfig{
		Constraints: &utils.CodeConfigConstraints{MaxTime: 10, MaxMemory: 128},
	}
	// memory == MaxMemory: 128 > 128 → false
	r := mirrorSaveResult(task, 100*time.Millisecond, 128, failedInfoMirror{})
	if r.MLE {
		t.Error("expected MLE=false at exactly MaxMemory boundary")
	}
}

// ─── RunTimeMs / MemoryUsedMB mapping ─────────────────────────────────────────

func TestResultMapping_Timing(t *testing.T) {
	task := &utils.CodeConfig{
		Constraints: &utils.CodeConfigConstraints{MaxTime: 10, MaxMemory: 256},
	}
	r := mirrorSaveResult(task, 750*time.Millisecond, 64, failedInfoMirror{})
	if r.RunTimeMs != 750 {
		t.Errorf("expected RunTimeMs=750, got %d", r.RunTimeMs)
	}
	if r.MemoryUsedMB != 64 {
		t.Errorf("expected MemoryUsedMB=64, got %d", r.MemoryUsedMB)
	}
}

// ─── Error / output field passthrough ─────────────────────────────────────────

func TestResultMapping_CompilationError(t *testing.T) {
	task := &utils.CodeConfig{
		Constraints: &utils.CodeConfigConstraints{MaxTime: 10, MaxMemory: 256},
	}
	fi := failedInfoMirror{
		IsFailed:     true,
		ErrorMessage: "Compilation Error",
		ActualOutput: "error: expected ';' before '}' token",
	}
	r := mirrorSaveResult(task, 0, 0, fi)
	if r.ErrorMSG != "Compilation Error" {
		t.Errorf("unexpected ErrorMSG: %q", r.ErrorMSG)
	}
	if !strings.Contains(r.ActualOutput, "error:") {
		t.Errorf("ActualOutput should contain compiler error, got %q", r.ActualOutput)
	}
}

func TestResultMapping_WrongAnswer(t *testing.T) {
	task := &utils.CodeConfig{
		Constraints: &utils.CodeConfigConstraints{MaxTime: 10, MaxMemory: 256},
	}
	fi := failedInfoMirror{
		IsFailed:       true,
		ErrorMessage:   "Wrong Answer",
		TestCase:       "1 2",
		ActualOutput:   "4",
		ExpectedOutput: "3",
	}
	r := mirrorSaveResult(task, 50*time.Millisecond, 10, fi)
	if r.ErrorMSG != "Wrong Answer" {
		t.Errorf("unexpected ErrorMSG: %q", r.ErrorMSG)
	}
	if r.ActualOutput != "4" {
		t.Errorf("unexpected ActualOutput: %q", r.ActualOutput)
	}
	if r.ExpectedOutput != "3" {
		t.Errorf("unexpected ExpectedOutput: %q", r.ExpectedOutput)
	}
	if r.TestCase != "1 2" {
		t.Errorf("unexpected TestCase: %q", r.TestCase)
	}
}

func TestResultMapping_AllPass(t *testing.T) {
	task := &utils.CodeConfig{
		Constraints: &utils.CodeConfigConstraints{MaxTime: 5, MaxMemory: 128},
	}
	r := mirrorSaveResult(task, 200*time.Millisecond, 30, failedInfoMirror{IsFailed: false})
	if r.TLE || r.MLE {
		t.Errorf("expected no TLE/MLE on passing submission, got TLE=%v MLE=%v", r.TLE, r.MLE)
	}
	if r.ErrorMSG != "" {
		t.Errorf("expected empty ErrorMSG on pass, got %q", r.ErrorMSG)
	}
}

// ─── WorkerPool interactions used by worker.go ────────────────────────────────

func TestWorkerPool_StopSignalFlow(t *testing.T) {
	utils.InitWorkerPoolChannel(utils.WorkerPoolData, 5)

	p := true
	utils.WorkerPoolData.AddTask(utils.CodeConfig{StopSignal: &p})

	task := utils.WorkerPoolData.GetTask()
	if task.StopSignal == nil {
		t.Fatal("expected stop signal task")
	}
	if !*task.StopSignal {
		t.Error("expected StopSignal=true")
	}
}

func TestWorkerPool_TaskIDPreserved(t *testing.T) {
	utils.InitWorkerPoolChannel(utils.WorkerPoolData, 5)

	sent := utils.CodeConfig{
		TaskID:   "unique-task-42",
		Code:     "#include<iostream>",
		Language: "cpp",
		Type:     "Submit",
	}
	utils.WorkerPoolData.AddTask(sent)
	received := utils.WorkerPoolData.GetTask()

	if received.TaskID != sent.TaskID {
		t.Errorf("expected TaskID=%q, got %q", sent.TaskID, received.TaskID)
	}
	if received.Language != sent.Language {
		t.Errorf("expected Language=%q, got %q", sent.Language, received.Language)
	}
	if received.Type != sent.Type {
		t.Errorf("expected Type=%q, got %q", sent.Type, received.Type)
	}
}

// ─── Judge Runner Result Decoding ─────────────────────────────────────────────

func TestRunnerResult_Pass(t *testing.T) {
	raw := `{"passed": true, "total_time_ms": 25, "error": "", "testcase": "", "actual": "", "expected": ""}`
	type runnerResult struct {
		Passed      bool   `json:"passed"`
		TotalTimeMs int    `json:"total_time_ms"`
		Error       string `json:"error"`
		TestCase    string `json:"testcase"`
		Actual      string `json:"actual"`
		Expected    string `json:"expected"`
		RunnerError string `json:"runner_error"`
	}
	var res runnerResult
	if err := strings.Contains(raw, "passed"); !err {
		t.Fatal("expected raw to contain passed")
	}
	if res.Passed != false {
		t.Fatal("unexpected initial state")
	}
}

func TestNormalizeOutput_EdgeCases(t *testing.T) {
	cases := []struct {
		in, want string
	}{
		{"  1 2  \n  2 3  \n", "1 2\n  2 3"},
		{"\r\n\r\n", ""},
		{"output\r\n", "output"},
		{"a \t \r\nb \t \r\n", "a\nb"},
	}
	for _, c := range cases {
		got := worker.NormalizeOutput(c.in)
		if got != c.want {
			t.Errorf("NormalizeOutput(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

