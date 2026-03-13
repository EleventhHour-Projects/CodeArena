// This file contains global variables and utility functions that are used throughout the code executor service
// It includes the configuration for the worker pool, global variables for Redis and MongoDB connections, and utility functions for error handling and task management
// The constants defined in this file include the size of the worker pool, which determines how many concurrent workers can process code execution tasks
//
// The CodeConfig struct represents the configuration for a code execution task, including the task ID, code to be executed, programming language, and test cases
// The WorkerPool struct manages the worker pool for executing code tasks, keeping track of the number of active workers and providing a channel for task management
// The ErrorHandler function is a utility function that panics if the provided error is not nil, allowing for consistent error handling throughout the application
package utils

import (
	"errors"
	"sync"
	"time"
)

// This file contains global variables and utility functions that are used throughout the code executor service
// It includes the configuration for the worker pool, global variables for Redis and MongoDB connections, and utility functions for error handling and task management
// The constants defined in this file include the size of the worker pool, which determines how many concurrent workers can process code execution tasks
const (
	// WORKER_POOL_SIZE is a constant that defines the number of worker goroutines that will be spawned to process code execution tasks from the worker pool
	// This constant allows for easy configuration of the worker pool size based on the needs of the application and available resources, enabling efficient processing of code execution tasks while managing system resources effectively
	// The value of WORKER_POOL_SIZE can be adjusted to increase or decrease the number of concurrent workers, allowing for scalability and optimization of the code execution service based on the expected workload and performance requirements
	WORKER_POOL_SIZE = 3
)

// Global variables for configuration and shared data
var REDIS_ADDR string
var REDIS_PASSWORD string
var MONGO_URI string

// CustomWorkerPoolSize is a global variable that can be used to override the default worker pool size defined by the WORKER_POOL_SIZE constant, allowing for dynamic configuration of the worker pool size based on runtime conditions or specific requirements of the application
var CustomWorkerPoolSize int

type CodeConfigConstraints struct {
	MaxTime   int `json:"max_time,omitempty"`
	MaxMemory int `json:"max_memory,omitempty"`
}

// CodeConfig is a struct that represents the configuration for a code execution task
// It contains the task ID, code to be executed, programming language, and test cases
// TaskID is a unique identifier for the task, Code is the code to be executed, Language is the programming language of the code, and TestCases is a map of input-output pairs for testing the code
type CodeConfig struct {
	TaskID      string                 `json:"task_id,omitempty"`
	Code        string                 `json:"code,omitempty"`
	Language    string                 `json:"language,omitempty"`
	TestCases   map[string]string      `json:"test_cases,omitempty"`
	Constraints *CodeConfigConstraints `json:"constraints,omitempty"`
	UserID      string                 `json:"user_id,omitempty"`
	BattleID    string                 `json:"battle_id,omitempty"`
	ProblemID   string                 `json:"problem_id,omitempty"`
}

// WorkerPool is a struct that manages the worker pool for executing code tasks
// It keeps track of the number of active workers and provides a channel for adding and retrieving tasks
// activeWorkerCount is an integer that keeps track of the number of active workers currently processing tasks
// mu is a mutex to ensure thread-safe access to the activeWorkerCount and channel
// channel is a channel that allows tasks to be added to the worker pool and retrieved by workers for processing
type WorkerPool struct {
	// activeWorkerCount is an integer that keeps track of the number of active workers currently processing tasks
	activeWorkerCount int
	// mu is a mutex to ensure thread-safe access to the activeWorkerCount and channel
	mu sync.Mutex
	// channel is a channel that allows tasks to be added to the worker pool and retrieved by workers for processing
	channel chan CodeConfig
}

// ExecutionCode is a struct that represents the structure of the execution code document in the MongoDB collection
// It contains fields for the code to be executed, programming language, user ID, status, battle ID, problem ID, and creation timestamp
// The struct tags specify how the fields are mapped to the MongoDB document fields, with omitempty used for optional fields and omitzero used for the CreatedAt field to omit it if it is zero
type ExecutionCode struct {
	ID        any       `bson:"_id"`
	Code      string    `bson:"code"`
	Language  string    `bson:"language"`
	UserID    string    `bson:"userId"`
	Status    *string   `bson:"status,omitempty"`
	BattleID  string    `bson:"battleId"`
	ProblemID string    `bson:"problemId"`
	CreatedAt time.Time `bson:"createdAt,omitzero"`
}

// Result is a struct that represents the result of a code execution task, including whether it resulted in a time limit exceeded (TLE) or memory limit exceeded (MLE), the failed test case number if applicable, and the runtime and memory usage
// TLE is a boolean that indicates whether the code execution resulted in a time limit exceeded error, MLE is a boolean that indicates whether the code execution resulted in a memory limit exceeded error, FailedTestCaseNumber is a pointer to a string that holds the number of the failed test case if applicable, RunTimeMs is an integer that represents the runtime of the code execution in milliseconds, and MemoryUsedMB is an integer that represents the memory used by the code execution in megabytes
type Result struct {
	TLE                  bool    `bson:"tle,omitempty"`
	MLE                  bool    `bson:"mle,omitempty"`
	FailedTestCaseNumber *string `bson:"failedTestCaseNumber,omitempty"`
	RunTimeMs            int     `bson:"runTimeMs,omitempty"`
	MemoryUsedMB         int     `bson:"memoryUsedMB,omitempty"`
}

// Submission is a struct that represents a code submission in the MongoDB collection, including fields for the submission ID, code, programming language, user ID, status, battle ID, problem ID, creation timestamp, and result of the submission
// The struct tags specify how the fields are mapped to the MongoDB document fields, with omitempty used for optional fields and omitzero used for the CreatedAt field to omit it if it is zero
type Submission struct {
	ID        any       `bson:"_id"`
	Code      string    `bson:"code"`
	Language  string    `bson:"language"`
	UserID    string    `bson:"userId"`
	Status    *string   `bson:"status,omitempty"`
	BattleID  string    `bson:"battleId"`
	ProblemID string    `bson:"problemId"`
	CreatedAt time.Time `bson:"createdAt,omitzero"`
	Result    *Result   `bson:"result,omitempty"`
}

var WorkerPoolData = &WorkerPool{activeWorkerCount: 0, mu: sync.Mutex{}, channel: make(chan CodeConfig)}

// Increment increments the active worker count by 1 in a thread-safe manner
func (wp *WorkerPool) Increment() {
	wp.mu.Lock()
	defer wp.mu.Unlock()
	wp.activeWorkerCount++
}

// Decrement decrements the active worker count by 1 in a thread-safe manner
func (wp *WorkerPool) Decrement() {
	wp.mu.Lock()
	defer wp.mu.Unlock()
	wp.activeWorkerCount--
}

// GetCount returns the current number of active workers in a thread-safe manner
func (wp *WorkerPool) GetCount() int {
	wp.mu.Lock()
	defer wp.mu.Unlock()
	return wp.activeWorkerCount
}

// AddTask adds a task to the worker pool's channel for processing by workers
// task is the CodeConfig struct that represents the configuration for a code execution task to be added to the worker pool
// The function sends the task to the worker pool's channel, allowing workers to retrieve and process it
func (wp *WorkerPool) AddTask(task CodeConfig) {
	wp.channel <- task
}

// GetTask retrieves a task from the worker pool's channel for processing by workers
// The function receives a task from the worker pool's channel and returns it as a CodeConfig struct for processing by workers
// It allows workers to retrieve tasks that have been added to the worker pool for execution
func (wp *WorkerPool) GetTask() CodeConfig {
	return <-wp.channel
}

// ErrorHandler is a utility function that panics if the provided error is not nil
// It is used throughout the application to handle errors in a consistent manner
// err is the error to be checked. If err is not nil, the function will panic with the error message
func ErrorHandler(err error) {
	if err != nil {
		panic(err)
	}
}

func FakeError() error {
	return errors.New("fake error")
}
