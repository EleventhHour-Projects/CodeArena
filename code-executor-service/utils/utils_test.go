package utils_test

import (
	"sync"
	"testing"
	"time"

	"executor-service/utils"

	"os"
)

// ─── WorkerPool ────────────────────────────────────────────────────────────────

func TestWorkerPool_IncrementDecrement(t *testing.T) {
	wp := &utils.WorkerPool{}
	utils.ResetWorkerPool(wp)

	wp.Increment()
	wp.Increment()
	if got := wp.GetCount(); got != 2 {
		t.Errorf("expected count=2, got %d", got)
	}

	wp.Decrement()
	if got := wp.GetCount(); got != 1 {
		t.Errorf("expected count=1 after decrement, got %d", got)
	}
}

func TestWorkerPool_ConcurrentIncrement(t *testing.T) {
	wp := &utils.WorkerPool{}
	utils.ResetWorkerPool(wp)

	const goroutines = 50
	var wg sync.WaitGroup
	for i := 0; i < goroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			wp.Increment()
		}()
	}
	wg.Wait()

	if got := wp.GetCount(); got != goroutines {
		t.Errorf("expected count=%d after concurrent increments, got %d", goroutines, got)
	}
}

func TestWorkerPool_Auto(t *testing.T) {
	wp := &utils.WorkerPool{}
	utils.ResetWorkerPool(wp)

	if wp.GetAuto() {
		t.Error("expected auto=false initially")
	}

	wp.SetAuto(true)
	if !wp.GetAuto() {
		t.Error("expected auto=true after SetAuto(true)")
	}

	wp.SetAuto(false)
	if wp.GetAuto() {
		t.Error("expected auto=false after SetAuto(false)")
	}
}

func TestWorkerPool_AddGetTask(t *testing.T) {
	wp := &utils.WorkerPool{}
	utils.ResetWorkerPool(wp)
	utils.InitWorkerPoolChannel(wp, 10)

	task := utils.CodeConfig{
		TaskID:   "test-task-1",
		Code:     `#include<stdio.h>\nint main(){printf("hi");}`,
		Language: "c",
	}

	go wp.AddTask(task)

	got := wp.GetTask()
	if got.TaskID != task.TaskID {
		t.Errorf("expected task id=%s, got=%s", task.TaskID, got.TaskID)
	}
	if got.Language != task.Language {
		t.Errorf("expected language=%s, got=%s", task.Language, got.Language)
	}
}

func TestWorkerPool_ChannelLength(t *testing.T) {
	wp := &utils.WorkerPool{}
	utils.ResetWorkerPool(wp)
	utils.InitWorkerPoolChannel(wp, 10)

	for i := 0; i < 3; i++ {
		wp.AddTask(utils.CodeConfig{TaskID: "t"})
	}

	if l := wp.GetChannelLength(); l != 3 {
		t.Errorf("expected channel length=3, got %d", l)
	}
}

// ─── Worker Registry ───────────────────────────────────────────────────────────

func TestWorkerPool_Registry(t *testing.T) {
	wp := &utils.WorkerPool{}
	utils.ResetWorkerPool(wp)

	cid := "abc123"

	if wp.IsWorkerRegistered(cid) {
		t.Error("expected worker not registered initially")
	}

	wp.RegisterWorker(cid)
	if !wp.IsWorkerRegistered(cid) {
		t.Error("expected worker registered after RegisterWorker")
	}

	task := &utils.CodeConfig{TaskID: "active-task"}
	wp.SetActiveTask(cid, task)

	wp.UnregisterWorker(cid)
	if wp.IsWorkerRegistered(cid) {
		t.Error("expected worker unregistered after UnregisterWorker")
	}
}

func TestWorkerPool_StealActiveTask(t *testing.T) {
	wp := &utils.WorkerPool{}
	utils.ResetWorkerPool(wp)

	cid := "container-xyz"
	task := &utils.CodeConfig{TaskID: "stolen-task"}

	wp.RegisterWorker(cid)
	wp.SetActiveTask(cid, task)

	stolen := wp.StealActiveTask(cid)
	if stolen == nil {
		t.Fatal("expected to steal a task, got nil")
	}
	if stolen.TaskID != "stolen-task" {
		t.Errorf("expected stolen task id=stolen-task, got=%s", stolen.TaskID)
	}

	// Worker should now be unregistered
	if wp.IsWorkerRegistered(cid) {
		t.Error("expected worker to be unregistered after StealActiveTask")
	}

	// Steal from non-existent is nil
	if wp.StealActiveTask("nonexistent") != nil {
		t.Error("expected nil steal from nonexistent worker")
	}
}

// ─── TaskProcessingInfo ────────────────────────────────────────────────────────

func TestTaskProcessingInfo_AverageTime_Empty(t *testing.T) {
	ti := &utils.TaskProcessingInfo{}

	if avg := ti.GetAverageTime(); avg != 0 {
		t.Errorf("expected avg=0 with no tasks, got %f", avg)
	}
}

func TestTaskProcessingInfo_IncrementAndAverage(t *testing.T) {
	ti := &utils.TaskProcessingInfo{}

	ti.IncrementTime(200 * time.Millisecond)
	ti.IncrementTime(400 * time.Millisecond)

	if total := ti.GetTotalTasks(); total != 2 {
		t.Errorf("expected 2 tasks, got %d", total)
	}

	totalSec := ti.GetTotalTime()
	if totalSec < 0.59 || totalSec > 0.61 {
		t.Errorf("expected total ~0.6s, got %f", totalSec)
	}

	avg := ti.GetAverageTime()
	if avg < 0.29 || avg > 0.31 {
		t.Errorf("expected avg ~0.3s, got %f", avg)
	}
}

func TestTaskProcessingInfo_ConcurrentIncrement(t *testing.T) {
	ti := &utils.TaskProcessingInfo{}

	const n = 100
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			ti.IncrementTime(10 * time.Millisecond)
		}()
	}
	wg.Wait()

	if total := ti.GetTotalTasks(); total != n {
		t.Errorf("expected %d tasks, got %d", n, total)
	}
}

// ─── GetEnv ────────────────────────────────────────────────────────────────────

func TestGetEnv_SetVariable(t *testing.T) {
	os.Setenv("TEST_VAR", "hello")
	defer os.Unsetenv("TEST_VAR")

	if got := utils.GetEnv("TEST_VAR", "fallback"); got != "hello" {
		t.Errorf("expected 'hello', got %q", got)
	}
}

func TestGetEnv_Fallback(t *testing.T) {
	os.Unsetenv("MISSING_VAR")

	if got := utils.GetEnv("MISSING_VAR", "default-value"); got != "default-value" {
		t.Errorf("expected 'default-value', got %q", got)
	}
}

func TestGetEnv_EmptyFallback(t *testing.T) {
	os.Unsetenv("EMPTY_VAR")

	if got := utils.GetEnv("EMPTY_VAR", ""); got != "" {
		t.Errorf("expected empty string, got %q", got)
	}
}

// ─── RandomString ──────────────────────────────────────────────────────────────

func TestRandomString_Length(t *testing.T) {
	for _, n := range []int{0, 1, 8, 16, 64} {
		got := utils.RandomString(n)
		if len(got) != n {
			t.Errorf("RandomString(%d): expected length %d, got %d", n, n, len(got))
		}
	}
}

func TestRandomString_Uniqueness(t *testing.T) {
	const runs = 1000
	seen := make(map[string]bool, runs)
	for i := 0; i < runs; i++ {
		s := utils.RandomString(16)
		if seen[s] {
			t.Errorf("RandomString collision detected: %q", s)
		}
		seen[s] = true
	}
}

func TestRandomString_CharSet(t *testing.T) {
	const validChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0987654321"
	valid := make(map[byte]bool, len(validChars))
	for i := range validChars {
		valid[validChars[i]] = true
	}

	s := utils.RandomString(256)
	for i := range s {
		if !valid[s[i]] {
			t.Errorf("RandomString produced invalid character: %q", s[i])
		}
	}
}

// ─── CodeConfig ────────────────────────────────────────────────────────────────

func TestCodeConfig_StopSignal(t *testing.T) {
	p := true
	cfg := utils.CodeConfig{StopSignal: &p}

	if cfg.StopSignal == nil || !*cfg.StopSignal {
		t.Error("expected StopSignal=true")
	}
}

func TestCodeConfig_ZeroValue(t *testing.T) {
	var cfg utils.CodeConfig
	if cfg.TaskID != "" || cfg.Language != "" || cfg.StopSignal != nil {
		t.Error("zero-value CodeConfig should have empty fields")
	}
}
