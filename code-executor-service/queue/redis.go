package queue

import (
	"context"
	"executor-service/database"
	"executor-service/utils"
	"fmt"

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
	fmt.Println("Redis Queue initialized with address:", utils.REDIS_ADDR)
}

func NewRedisQueue(addr string) *RedisQueue {
	return &RedisQueue{
		client: redis.NewClient(&redis.Options{
			Addr: addr,
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

// ListenForTasks continuously listens for tasks on the "tasks" queue and adds them to the worker pool
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
				fmt.Println("Error popping task:", err)
				continue
			}
			fmt.Println("Received task:", task)
			data, err := database.MongoDB.GetExecutionCodeData(task)
			if err != nil {
				fmt.Println("Error fetching execution code data:", err)
				continue
			}
			testCases, err := database.GetProblemTestCases(data.ProblemID)
			if err != nil {
				fmt.Println("Error fetching problem test cases:", err)
				continue
			}
			maxTime, maxMemory, err := database.GetProblemConstraints(data.ProblemID)
			if err != nil {
				fmt.Println("Error fetching problem constraints:", err)
				continue
			}
			utils.WorkerPoolData.AddTask(utils.CodeConfig{
				TaskID:    task,
				Code:      data.Code,
				Language:  data.Language,
				TestCases: testCases,
				UserID:    data.UserID,
				BattleID:  data.BattleID,
				ProblemID: data.ProblemID,
				Constraints: &utils.CodeConfigConstraints{
					MaxTime:   maxTime,
					MaxMemory: maxMemory,
				},
			})
		}
	}
}
