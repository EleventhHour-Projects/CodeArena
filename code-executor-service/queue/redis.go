package queue

import (
	"context"
	"executor-service/database"
	"executor-service/utils"
	"fmt"
	"strings"

	"github.com/redis/go-redis/v9"
)

// RedisQueue is a struct that holds the Redis client and provides methods for interacting with the Redis queue
// The client field is the Redis client that allows us to interact with the Redis server and perform operations on the queue
type RedisQueue struct {
	client *redis.Client
}

// Queue is a global variable that holds the RedisQueue instance, allowing us to access the queue throughout the application
var Queue *RedisQueue

// InitRedis initializes the Redis client and sets up the queue
func InitRedis() {
	Queue = NewRedisQueue(utils.REDIS_ADDR)
	fmt.Println(utils.Green+"Redis Queue initialized with address:"+utils.Reset, utils.REDIS_ADDR)
}

func NewRedisQueue(addr string) *RedisQueue {
	return &RedisQueue{
		client: redis.NewClient(&redis.Options{
			Addr:     addr,
			Password: utils.REDIS_PASSWORD,
		}),
	}
}

// Push adds a task to the "tasks" queue
func (r *RedisQueue) Push(ctx context.Context, key string, value interface{}) error {
	return r.client.LPush(ctx, key, value).Err()
}

// Pop removes and returns a task from the "tasks" queue
func (r *RedisQueue) Pop(ctx context.Context, key string) (string, error) {
	result, err := r.client.BRPop(ctx, 0, key).Result()
	if err != nil {
		return "", err
	}

	// BRPop returns [key, value]
	return result[1], nil
}

// processTask resolves the task metadata and problem test cases asynchronously before dispatching to the worker pool
func processTask(ctx context.Context, task string) {
	data, err := database.MongoDB.GetExecutionCodeData(task)
	if err != nil {
		fmt.Println(utils.Red+"Error getting execution code data:"+utils.Reset, err)
		return
	}

	// Normalize codeType: default to "battle" if empty/battleId exists, otherwise "normal"
	codeType := strings.ToLower(strings.TrimSpace(data.CodeType))
	if codeType == "" {
		if !data.BattleID.IsZero() {
			codeType = "battle"
		} else {
			codeType = "normal"
		}
	}

	execType := strings.TrimSpace(data.Type)
	if execType == "" {
		execType = "Run"
	}

	var testCaseList []utils.TestCaseItem
	testCases := make(map[string]string)

	// Determine test cases to run
	// Case 1: Custom testcases provided in document or Type == "Custom"
	if len(data.Testcases) > 0 || strings.EqualFold(execType, "Custom") {
		for _, tc := range data.Testcases {
			item := utils.TestCaseItem{
				Input:    tc.Input,
				Output:   tc.Output,
				IsHidden: false, // Custom test cases are visible to the user
			}
			testCaseList = append(testCaseList, item)
			testCases[tc.Input] = tc.Output
		}
	} else if strings.EqualFold(execType, "NonHidden") || strings.EqualFold(execType, "Run") {
		// Case 2: Non-hidden testcases only (Sample / Run test cases)
		items, err := database.GetProblemTestCasesList(data.Problem.ID, "non_hidden")
		if err != nil {
			fmt.Println(utils.Red+"Error fetching non-hidden test cases:"+utils.Reset, err)
			return
		}
		testCaseList = items
		for _, tc := range items {
			testCases[tc.Input] = tc.Output
		}
	} else {
		// Case 3: All testcases ("Submit" or "All")
		items, err := database.GetProblemTestCasesList(data.Problem.ID, "all")
		if err != nil {
			fmt.Println(utils.Red+"Error fetching all problem test cases:"+utils.Reset, err)
			return
		}
		testCaseList = items
		for _, tc := range items {
			testCases[tc.Input] = tc.Output
		}
	}

	maxTime, maxMemory, err := database.GetProblemConstraints(data.Problem.ID)
	if err != nil {
		fmt.Println(utils.Red+"Error fetching problem constraints:"+utils.Reset, err)
		return
	}

	utils.TaskInfo.IncrementSubmitted()
	utils.WorkerPoolData.AddTask(utils.CodeConfig{
		TaskID:       task,
		Code:         data.Code,
		Language:     data.Language,
		CodeType:     codeType,
		TestCases:    testCases,
		TestCaseList: testCaseList,
		UserID:       data.UserID,
		BattleID:     data.BattleID,
		Problem:      data.Problem,
		Constraints: &utils.CodeConfigConstraints{
			MaxTime:   maxTime,
			MaxMemory: maxMemory,
		},
		Type: execType,
	})
}

// ListenForTasks continuously listens for tasks on the "tasks" queue and dispatches them to the worker pool
func ListenForTasks(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
			task, err := Queue.Pop(ctx, "tasks")
			if err != nil {
				if err == redis.Nil {
					continue
				}
				if ctx.Err() != nil {
					return
				}
				fmt.Println(utils.Red+"Error popping task:"+utils.Reset, err)
				continue
			}
			go processTask(ctx, task)
		}
	}
}
