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
	"flag"
	"sync"
	"time"

	"os"

	"github.com/google/go-github/v84/github"
	"go.mongodb.org/mongo-driver/v2/bson"
)

// This file contains global variables and utility functions that are used throughout the code executor service
// It includes the configuration for the worker pool, global variables for Redis and MongoDB connections, and utility functions for error handling and task management
// The constants defined in this file include the size of the worker pool, which determines how many concurrent workers can process code execution tasks
const (
	// WORKER_POOL_SIZE is a constant that defines the number of worker goroutines that will be spawned to process code execution tasks from the worker pool
	// This constant allows for easy configuration of the worker pool size based on the needs of the application and available resources, enabling efficient processing of code execution tasks while managing system resources effectively
	// The value of WORKER_POOL_SIZE can be adjusted to increase or decrease the number of concurrent workers, allowing for scalability and optimization of the code execution service based on the expected workload and performance requirements
	WORKER_POOL_SIZE = 10
)

// Global variables for configuration and shared data
var REDIS_ADDR string
var REDIS_PASSWORD string
var MONGO_URI string
var GITHUB_TOKEN string
var INTERNAL_KEY string
var WSSIP string

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
	UserID      bson.ObjectID          `json:"user_id,omitempty"`
	BattleID    bson.ObjectID          `json:"battle_id,omitempty"`
	Problem     Problem                `json:"problem,omitempty"`
	Type        string                 `json:"type,omitempty"`
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
	ID        bson.ObjectID `bson:"_id"`
	Code      string        `bson:"code"`
	Type      string        `bson:"type"`
	Language  string        `bson:"language"`
	UserID    bson.ObjectID `bson:"userId"`
	Status    *string       `bson:"status,omitempty"`
	BattleID  bson.ObjectID `bson:"battleId"`
	Problem   Problem       `bson:"problem"`
	Testcases []struct {
		Input  string `bson:"input"`
		Output string `bson:"output"`
	} `bson:"testcases,omitempty"`
	CreatedAt time.Time `bson:"createdAt,omitzero"`
}

type Problem struct {
	Difficulty string `bson:"difficulty"`
	ID         int    `bson:"id"`
}

// Result is a struct that represents the result of a code execution task, including whether it resulted in a time limit exceeded (TLE) or memory limit exceeded (MLE), the failed test case number if applicable, and the runtime and memory usage
// TLE is a boolean that indicates whether the code execution resulted in a time limit exceeded error, MLE is a boolean that indicates whether the code execution resulted in a memory limit exceeded error, FailedTestCaseNumber is a pointer to a string that holds the number of the failed test case if applicable, RunTimeMs is an integer that represents the runtime of the code execution in milliseconds, and MemoryUsedMB is an integer that represents the memory used by the code execution in megabytes
type Result struct {
	TLE                  bool    `bson:"tle,omitempty"`
	MLE                  bool    `bson:"mle,omitempty"`
	FailedTestCaseNumber *string `bson:"failedTestCaseNumber,omitempty"`
	RunTimeMs            int     `bson:"runTimeMs,omitempty"`
	MemoryUsedMB         int     `bson:"memoryUsedMB,omitempty"`
	ErrorMSG             string  `bson:"errorMsg,omitempty"`
	ActualOutput         string  `bson:"actualOutput,omitempty"`
}

// Submission is a struct that represents a code submission in the MongoDB collection, including fields for the submission ID, code, programming language, user ID, status, battle ID, problem ID, creation timestamp, and result of the submission
// The struct tags specify how the fields are mapped to the MongoDB document fields, with omitempty used for optional fields and omitzero used for the CreatedAt field to omit it if it is zero
type Submission struct {
	ID              bson.ObjectID `bson:"_id,omitempty"`
	ExecutionCodeID bson.ObjectID `bson:"execCodeId"`
	Code            string        `bson:"code"`
	Language        string        `bson:"language"`
	UserID          bson.ObjectID `bson:"userId"`
	Status          *string       `bson:"status,omitempty"`
	BattleID        bson.ObjectID `bson:"battleId"`
	Problem         Problem       `bson:"problem"`
	CreatedAt       time.Time     `bson:"createdAt,omitzero"`
	Result          *Result       `bson:"result,omitempty"`
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

// FlagUsage is a function that prints the usage information for the command-line flags of the application, providing users with guidance on how to run the application and what options are available for configuration
// It displays the usage syntax, available options, and examples of how to run the application with different configurations, helping users understand how to use the command-line flags effectively when starting the code executor service
var FlagUsage = func() {
	flag.PrintDefaults()
}

// TaskProcessingInfo is a struct that keeps track of the total number of tasks processed and the total time taken for processing those tasks, providing a way to monitor and analyze the performance of the code execution service
// TotalTaskDone is an integer that counts the total number of tasks that have been processed, TotalTime is a time.Duration that accumulates the total time taken for processing tasks, and mu is a mutex to ensure thread-safe access to these fields when updating and retrieving performance metrics
type TaskProcessingInfo struct {
	TotalTaskDone int
	TotalTime     time.Duration
	mu            sync.Mutex
}

// IncrementTime increments the total time taken for processing tasks by the given duration in a thread-safe manner, allowing for accurate tracking of the time spent on processing code execution tasks
func (t *TaskProcessingInfo) IncrementTime(duration time.Duration) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.TotalTime += duration
	t.TotalTaskDone++
}

// GetAverageTime calculates and returns the average time taken for processing tasks by dividing the total time by the total number of tasks done, providing insights into the performance of the code execution service and allowing for analysis of how long tasks are taking on average
func (t *TaskProcessingInfo) GetAverageTime() float64 {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.TotalTaskDone == 0 {
		return 0
	}
	avg := t.TotalTime / time.Duration(t.TotalTaskDone)
	return avg.Seconds()
}
func (t *TaskProcessingInfo) GetTotalTime() float64 {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.TotalTime.Seconds()
}

func (t *TaskProcessingInfo) GetTotalTasks() int {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.TotalTaskDone
}

// Global variable to keep track of task processing information, allowing for monitoring and analysis of the performance of the code execution service by tracking the total number of tasks processed and the total time taken for processing those tasks in a thread-safe manner
var TaskInfo = &TaskProcessingInfo{TotalTaskDone: 0, TotalTime: 0, mu: sync.Mutex{}}

// For Info API
var StartTime time.Time

type GitHubClient struct {
	Client *github.Client
	Owner  string
	Repo   string
}

var GhClient *GitHubClient

func GetEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
