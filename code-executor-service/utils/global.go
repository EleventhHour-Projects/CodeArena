// This file contains global variables and utility functions that are used throughout the code executor service
// It includes the configuration for the worker pool, global variables for Redis and MongoDB connections, and utility functions for error handling and task management
// The constants defined in this file include the size of the worker pool, which determines how many concurrent workers can process code execution tasks
//
// The CodeConfig struct represents the configuration for a code execution task, including the task ID, code to be executed, programming language, and test cases
// The WorkerPool struct manages the worker pool for executing code tasks, keeping track of the number of active workers and providing a channel for task management
// The ErrorHandler function is a utility function that panics if the provided error is not nil, allowing for consistent error handling throughout the application
package utils

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"flag"
	"fmt"
	"math/rand"
	"os"
	"sync"
	"time"

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
	WORKER_POOL_SIZE = 4
	// DefaultExecutionImage is the Docker image used by the executor workers when EXECUTION_IMAGE is not set.
	DefaultExecutionImage = "multi-lang-runner:latest"
)

// ExecutionImage returns the Docker image used for code execution workers.
// It can be overridden via the EXECUTION_IMAGE environment variable.
func ExecutionImage() string {
	if image := os.Getenv("EXECUTION_IMAGE"); image != "" {
		return image
	}
	return DefaultExecutionImage
}

// Global variables for configuration and shared data
var REDIS_ADDR string
var REDIS_PASSWORD string
var MONGO_URI string
var GITHUB_TOKEN string
var INTERNAL_KEY string
var WSSIP string
var MASALA string

// WorkerCTX is a global variable that holds the context for the worker pool, allowing for cancellation and management of worker goroutines in a coordinated manner across the application
var WorkerCTX context.Context

// MainProcessID is a global variable that stores the process ID of the main server process, providing visibility into the server's process information for monitoring and management purposes
var MainProcessID int

// APIOnly is a global variable that indicates whether the service is running in API-only mode, which disables worker-related endpoints and functionality, allowing for a more lightweight deployment of the service when worker processing is not needed
var APIOnly bool

// CustomWorkerPoolSize is a global variable that can be used to override the default worker pool size defined by the WORKER_POOL_SIZE constant, allowing for dynamic configuration of the worker pool size based on runtime conditions or specific requirements of the application
var CustomWorkerPoolSize int

type CodeConfigConstraints struct {
	MaxTime   int `json:"max_time,omitempty"`
	MaxMemory int `json:"max_memory,omitempty"`
}

// TestCaseItem represents a single test case with input, expected output, and whether it is hidden.
type TestCaseItem struct {
	Input    string `json:"input" bson:"input"`
	Output   string `json:"output" bson:"output"`
	IsHidden bool   `json:"is_hidden,omitempty" bson:"isHidden,omitempty"`
}

// CodeConfig is a struct that represents the configuration for a code execution task
// It contains the task ID, code to be executed, programming language, and test cases
// TaskID is a unique identifier for the task, Code is the code to be executed, Language is the programming language of the code, and TestCases is a map of input-output pairs for testing the code
type CodeConfig struct {
	TaskID       string                 `json:"task_id,omitempty"`
	Code         string                 `json:"code,omitempty"`
	Language     string                 `json:"language,omitempty"`
	CodeType     string                 `json:"code_type,omitempty"` // "battle", "test", "normal"
	TestCases    map[string]string      `json:"test_cases,omitempty"`
	TestCaseList []TestCaseItem         `json:"test_case_list,omitempty"`
	Constraints  *CodeConfigConstraints `json:"constraints,omitempty"`
	UserID       bson.ObjectID          `json:"user_id,omitempty"`
	BattleID     bson.ObjectID          `json:"battle_id,omitempty"`
	Problem      Problem                `json:"problem,omitempty"`
	Type         string                 `json:"type,omitempty"`
	StopSignal   *bool
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
	// auto is a boolean that indicates whether the worker pool should automatically adjust the number of active workers based on the workload,
	// allowing for dynamic scaling of worker resources to efficiently handle varying workloads and optimize performance in the code execution service
	auto bool
	// muauto is a mutex to ensure thread-safe access to the auto field, allowing for concurrent updates and retrievals of the auto-scaling setting for the worker pool without
	muauto sync.Mutex
	// scalingMu is a mutex to synchronize scaling operations (scaling up/down or recycling workers),
	// ensuring that concurrent scaling routines (e.g., Auto and AutoClean) do not conflict.
	scalingMu sync.Mutex
	// ActiveTasks is a map that tracks which task is being executed by which container ID,
	// allowing for precise rescue of tasks during AutoClean events.
	// IT ALSO acts as the worker registry: if a key exists, the worker is "Active".
	ActiveTasks map[string]*CodeConfig
}

// ExecutionCode is a struct that represents the structure of the execution code document in the MongoDB collection
// It contains fields for the code to be executed, programming language, user ID, status, battle ID, problem ID, and creation timestamp
// The struct tags specify how the fields are mapped to the MongoDB document fields, with omitempty used for optional fields and omitzero used for the CreatedAt field to omit it if it is zero
type ExecutionCode struct {
	ID        bson.ObjectID  `bson:"_id"`
	Code      string         `bson:"code"`
	CodeType  string         `bson:"codeType,omitempty"` // "battle", "test", "normal"
	Type      string         `bson:"type"`               // "Run", "Submit", "Custom", "NonHidden", "All"
	Language  string         `bson:"language"`
	UserID    bson.ObjectID  `bson:"userId"`
	Status    *string        `bson:"status,omitempty"`
	BattleID  bson.ObjectID  `bson:"battleId,omitempty"`
	Problem   Problem        `bson:"problem,omitempty"`
	Testcases []TestCaseItem `bson:"testcases,omitempty"`
	CreatedAt time.Time      `bson:"createdAt,omitzero"`
}

type Problem struct {
	Difficulty string `bson:"difficulty,omitempty"`
	ID         int    `bson:"id,omitempty"`
}

// Result is a struct that represents the result of a code execution task...
type Result struct {
	TLE                  bool    `bson:"tle,omitempty" json:"tle,omitempty"`
	MLE                  bool    `bson:"mle,omitempty" json:"mle,omitempty"`
	FailedTestCaseNumber *string `bson:"failedTestCaseNumber,omitempty" json:"failedTestCaseNumber,omitempty"`
	RunTimeMs            int     `bson:"runTimeMs,omitempty" json:"runTimeMs,omitempty"`
	MemoryUsedMB         int     `bson:"memoryUsedMB,omitempty" json:"memoryUsedMB,omitempty"`
	ErrorMSG             string  `bson:"errorMsg,omitempty" json:"errorMsg,omitempty"`
	ActualOutput         string  `bson:"actualOutput,omitempty" json:"actualOutput,omitempty"`
	ExpectedOutput       string  `bson:"expectedOutput,omitempty" json:"expectedOutput,omitempty"`
	IsHidden             bool    `bson:"isHidden,omitempty" json:"isHidden,omitempty"`
	PassedCount          int     `bson:"passedCount,omitempty" json:"passedCount,omitempty"`
	TotalCount           int     `bson:"totalCount,omitempty" json:"totalCount,omitempty"`
}

// Submission is a struct that represents a code submission in the MongoDB collection, including fields for the submission ID, code, programming language, user ID, status, battle ID, problem ID, creation timestamp, and result of the submission
// The struct tags specify how the fields are mapped to the MongoDB document fields, with omitempty used for optional fields and omitzero used for the CreatedAt field to omit it if it is zero
type Submission struct {
	ID              bson.ObjectID `bson:"_id,omitempty"`
	ExecutionCodeID bson.ObjectID `bson:"execCodeId"`
	Code            string        `bson:"code"`
	CodeType        string        `bson:"codeType,omitempty"`
	Language        string        `bson:"language"`
	UserID          bson.ObjectID `bson:"userId"`
	Status          *string       `bson:"status,omitempty"`
	BattleID        bson.ObjectID `bson:"battleId,omitempty"`
	Problem         Problem       `bson:"problem,omitempty"`
	CreatedAt       time.Time     `bson:"createdAt,omitzero"`
	Result          *Result       `bson:"result,omitempty"`
}

// WorkerPoolData is a global variable that holds the instance of the WorkerPool struct, allowing for centralized management of the worker pool for executing code tasks throughout the application
// It provides a shared resource for managing the worker pool, including tracking the number of active workers, handling task management through the channel, and managing auto-scaling settings for the worker pool based on workload and resource availability
var WorkerPoolData = &WorkerPool{
	activeWorkerCount: 0,
	mu:                sync.Mutex{},
	channel:           make(chan CodeConfig, 10000),
	auto:              true,
	muauto:            sync.Mutex{},
	scalingMu:         sync.Mutex{},
	ActiveTasks:       make(map[string]*CodeConfig),
}

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

// FlagUsage is a function that prints the usage information for the command-line flags of the application, providing users with guidance on how to run the application and what options are available for configuration
// It displays the usage syntax, available options, and examples of how to run the application with different configurations, helping users understand how to use the command-line flags effectively when starting the code executor service
var FlagUsage = func() {
	flag.PrintDefaults()
}

// TaskProcessingInfo is a struct that keeps track of the total number of tasks processed and the total time taken for processing those tasks, providing a way to monitor and analyze the performance of the code execution service
// TotalTaskDone is an integer that counts the total number of tasks that have been processed, TotalTime is a time.Duration that accumulates the total time taken for processing tasks, and mu is a mutex to ensure thread-safe access to these fields when updating and retrieving performance metrics
type TaskProcessingInfo struct {
	TotalTaskDone      int
	TotalTime          time.Duration
	TotalTaskSubmitted int
	mu                 sync.Mutex
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

// GetTotalTime returns the total time taken for processing tasks in seconds, allowing for monitoring of the overall time spent on processing code execution tasks and providing insights into the performance of the service
func (t *TaskProcessingInfo) GetTotalTime() float64 {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.TotalTime.Seconds()
}

// GetTotalTasks returns the total number of tasks that have been processed in a thread-safe manner, allowing for monitoring and analysis of the workload handled by the code execution service
func (t *TaskProcessingInfo) GetTotalTasks() int {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.TotalTaskDone
}

// IncrementSubmitted increments the total number of tasks submitted in a thread-safe manner
func (t *TaskProcessingInfo) IncrementSubmitted() {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.TotalTaskSubmitted++
}

// GetTotalTasksSubmitted returns the total number of tasks submitted in a thread-safe manner
func (t *TaskProcessingInfo) GetTotalTasksSubmitted() int {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.TotalTaskSubmitted
}

// Global variable to keep track of task processing information, allowing for monitoring and analysis of the performance of the code execution service by tracking the total number of tasks processed and the total time taken for processing those tasks in a thread-safe manner
var TaskInfo = &TaskProcessingInfo{TotalTaskDone: 0, TotalTime: 0, TotalTaskSubmitted: 0, mu: sync.Mutex{}}

// For Info API
var StartTime time.Time

// GithubClient is a global variable that holds the GitHub client for interacting with the GitHub API, allowing for operations such as fetching pull requests and merging them as part of the code execution service's integration with GitHub
type GitHubClient struct {
	Client *github.Client
	Owner  string
	Repo   string
}

// GhClient is a global variable that holds the instance of the GitHubClient, providing a centralized point of access for interacting with the GitHub API throughout the application, allowing for consistent and efficient management of GitHub-related operations such as fetching pull requests and merging them as part of the code execution service's functionality
var GhClient *GitHubClient

// GetEnv is a utility function that retrieves the value of an environment variable by its key, with an option to provide a fallback value if the environment variable is not set, allowing for flexible configuration of the application through environment variables while providing default values when necessary
// key is the name of the environment variable to retrieve, and fallback is the value to return if the environment variable is not set, allowing for a convenient way to access configuration values from the environment with a fallback option for default values
func GetEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

// SetAuto sets the auto-scaling feature of the worker pool to the specified boolean value in a thread-safe manner, allowing for dynamic control over the worker pool's behavior based on demand and resource availability
// auto is a boolean value that indicates whether to enable or disable auto-scaling for the worker pool, and the function updates this setting in the WorkerPoolData struct while ensuring thread-safe access through the use of a mutex
func (wp *WorkerPool) SetAuto(auto bool) {
	wp.muauto.Lock()
	defer wp.muauto.Unlock()
	wp.auto = auto
}

// GetAuto retrieves the current status of the auto-scaling feature for the worker pool in a thread-safe manner, allowing for visibility into whether auto-scaling is enabled or disabled, and providing insights into the behavior of the worker pool based on demand and resource availability
// The function accesses the auto-scaling setting in the WorkerPoolData struct while ensuring thread-safe access through the use of a mutex, allowing clients to monitor the auto-scaling status of the worker pool effectively
func (wp *WorkerPool) GetAuto() bool {
	wp.muauto.Lock()
	defer wp.muauto.Unlock()
	return wp.auto
}

// GetChannelLength returns the current length of the worker pool's channel in a thread-safe manner, allowing for monitoring of the number of tasks currently waiting in the worker pool for processing by workers
// The function accesses the length of the channel while ensuring thread-safe access through the use of a mutex, providing insights into the workload and task queue of the worker pool for monitoring and analysis purposes
func (wp *WorkerPool) GetChannelLength() int {
	wp.mu.Lock()
	defer wp.mu.Unlock()
	return len(wp.channel)
}

func (wp *WorkerPool) ScalingMuLock() {
	wp.scalingMu.Lock()
}

func (wp *WorkerPool) ScalingMuUnlock() {
	wp.scalingMu.Unlock()
}

func (wp *WorkerPool) RegisterWorker(containerID string) {
	wp.mu.Lock()
	defer wp.mu.Unlock()
	wp.ActiveTasks[containerID] = nil
}

func (wp *WorkerPool) IsWorkerRegistered(containerID string) bool {
	wp.mu.Lock()
	defer wp.mu.Unlock()
	_, ok := wp.ActiveTasks[containerID]
	return ok
}

func (wp *WorkerPool) UnregisterWorker(containerID string) {
	wp.mu.Lock()
	defer wp.mu.Unlock()
	delete(wp.ActiveTasks, containerID)
}

func (wp *WorkerPool) SetActiveTask(containerID string, task *CodeConfig) {
	wp.mu.Lock()
	defer wp.mu.Unlock()
	// Only set if worker is still registered
	if _, ok := wp.ActiveTasks[containerID]; ok {
		wp.ActiveTasks[containerID] = task
	}
}

func (wp *WorkerPool) ClearActiveTask(containerID string) {
	wp.mu.Lock()
	defer wp.mu.Unlock()
	// Only clear if worker is still registered (don't re-add it if cleaned)
	if _, ok := wp.ActiveTasks[containerID]; ok {
		wp.ActiveTasks[containerID] = nil
	}
}

func (wp *WorkerPool) StealActiveTask(containerID string) *CodeConfig {
	wp.mu.Lock()
	defer wp.mu.Unlock()
	task, ok := wp.ActiveTasks[containerID]
	if ok {
		// UNREGISTER the worker immediately to mark it as cleaned
		delete(wp.ActiveTasks, containerID)
		return task
	}
	return nil
}

// User is a struct that represents a user in the MongoDB collection, including fields for the user ID, username, email, name, and rating
// The struct tags specify how the fields are mapped to the MongoDB document fields, with omitempty used for optional fields and bson:"_id,omitempty" used for the ID field to allow MongoDB to automatically generate an ObjectID if not provided
type User struct {
	ID              bson.ObjectID `bson:"_id"`
	Username        string        `bson:"username"`
	Email           string        `bson:"email"`
	Name            string        `bson:"name"`
	Rating          int           `bson:"rating"`
	AllotedConnID   string        `bson:"allotedConnId,omitempty"`
	CurrentBattleID bson.ObjectID `bson:"currentBattleId,omitempty"`
	Difficulty      string        `bson:"difficulty,omitempty"`
}

type BattleProblem struct {
	Difficulty string `bson:"difficulty"`
	ID         int    `bson:"id"`
}

type Battle struct {
	ID         bson.ObjectID   `bson:"_id,omitempty"`
	Player1    bson.ObjectID   `bson:"player1"`
	Player2    bson.ObjectID   `bson:"player2"`
	Status     string          `bson:"status"`
	CreatedAt  time.Time       `bson:"createdAt"`
	Difficulty string          `bson:"difficulty"`
	Type       string          `bson:"type"`
	Problems   []BattleProblem `bson:"problems"`
	StartTime  time.Time       `bson:"startTime,omitempty"`
}

type Token struct {
	Username   string
	UserID     bson.ObjectID
	Type       string // "matchmaking", "sse", "invitesse"
	Difficulty string
	Expires    time.Time
}

type TokenStore struct {
	mu    sync.Mutex
	store map[string]Token
}

var TokenStoreInstance = &TokenStore{
	store: make(map[string]Token),
	mu:    sync.Mutex{},
}

func (tc *TokenStore) GenerateToken(userID bson.ObjectID, username string, difficulty string, tokenType string) string {
	b := make([]byte, 16)
	rand.Read(b)

	randomPart := hex.EncodeToString(b)

	data := fmt.Sprintf("%s:%s:%s:%s",
		username,
		randomPart,
		tokenType,
		MASALA,
	)

	hash := sha256.Sum256([]byte(data))
	token := hex.EncodeToString(hash[:])

	tc.mu.Lock()
	tc.store[token] = Token{
		Username:   username,
		UserID:     userID,
		Type:       tokenType,
		Difficulty: difficulty,
		Expires:    time.Now().Add(10 * time.Minute),
	}
	tc.mu.Unlock()

	return token
}

func (tc *TokenStore) VerifyToken(token, username string, tokenType string) (string, bool) {
	tc.mu.Lock()
	defer tc.mu.Unlock()

	data, ok := tc.store[token]
	if !ok {
		return "", false
	}

	if time.Now().After(data.Expires) {
		delete(tc.store, token)
		return "", false
	}

	if data.Username != username || data.Type != tokenType {
		return "", false
	}

	return data.Difficulty, true
}

func (tc *TokenStore) ConsumeToken(token string) {
	tc.mu.Lock()
	defer tc.mu.Unlock()
	delete(tc.store, token)
}

func (tc *TokenStore) VerifySseToken(token string, userID string) bool {
	tc.mu.Lock()
	defer tc.mu.Unlock()

	data, ok := tc.store[token]
	if !ok || data.Type != "sse" {
		return false
	}

	if time.Now().After(data.Expires) {
		delete(tc.store, token)
		return false
	}

	if data.UserID.Hex() != userID {
		return false
	}

	return true
}

func (tc *TokenStore) VerifyInviteSseToken(token string, userID string) bool {
	tc.mu.Lock()
	defer tc.mu.Unlock()

	data, ok := tc.store[token]
	if !ok || data.Type != "invitesse" {
		return false
	}

	if time.Now().After(data.Expires) {
		delete(tc.store, token)
		return false
	}

	if data.UserID.Hex() != userID {
		return false
	}

	return true
}

func (tc *TokenStore) StartCleanup() {
	go func() {
		for {
			time.Sleep(5 * time.Minute)

			tc.mu.Lock()
			for k, v := range tc.store {
				if time.Now().After(v.Expires) {
					delete(tc.store, k)
				}
			}
			tc.mu.Unlock()
		}
	}()
}

func (tc *TokenStore) UserExists(username string) bool {
	tc.mu.Lock()
	defer tc.mu.Unlock()
	for _, token := range tc.store {
		if token.Username == username {
			return true
		}
	}
	return false
}
