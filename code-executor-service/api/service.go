package api

import (
	"context"
	"encoding/json"
	"executor-service/gh"
	"executor-service/utils"
	"executor-service/worker"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v3"
)

// Temporary function to add tasks to the queue, can be removed when the frontend is ready
// AddToQueue is a handler function that receives a code execution task in the request body, unmarshals it into a CodeConfig struct, and adds it to the worker pool's channel for processing by workers
// The function expects the request body to contain a JSON representation of a CodeConfig struct, which includes the code to be executed and any relevant configuration for the task
// If the request body is invalid or cannot be unmarshaled into a CodeConfig struct, the function returns a 400 Bad Request response with an error message
// If the task is successfully added to the worker pool, the function returns a success message indicating that the task has been added to the queue
func AddToQueue(c fiber.Ctx) error {
	var task utils.CodeConfig
	b := c.Body()
	err := json.Unmarshal(b, &task)

	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("Invalid request body")
	}
	utils.WorkerPoolData.AddTask(task)
	return c.SendString("Task added to queue")
}

// GetTaskInfo is a handler function that retrieves information about the task execution, such as the average execution time and total number of tasks processed, and returns it as a JSON response
// The function accesses the TaskInfo struct from the utils package, which contains methods to calculate the average execution time and track the total number of tasks processed by the worker pool
// The response includes the average execution time and total task count, allowing clients to monitor the performance of the task execution service
func GetTaskInfo(c fiber.Ctx) error {
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"average_time_to_execute_task_inSec": utils.TaskInfo.GetAverageTime(),
		"total_tasks":                        utils.TaskInfo.GetTotalTasks(),
		"total_time_to_execute_task_inSec":   utils.TaskInfo.GetTotalTime(),
		"active_worker":                      utils.WorkerPoolData.GetCount(),
		"total_active_time":                  time.Since(utils.StartTime).String(),
	})
}

func SpawnOneWorker(c fiber.Ctx) error {
	if c.Get("X-Internal-Key") != utils.INTERNAL_KEY {
		return c.Status(fiber.StatusUnauthorized).SendString("Unauthorized")
	}
	worker.SpawnWorkerFailed(utils.WorkerCTX)
	return c.SendStatus(200)
}

func StopAnyOneWorker(c fiber.Ctx) error {
	if c.Get("X-Internal-Key") != utils.INTERNAL_KEY {
		return c.Status(fiber.StatusUnauthorized).SendString("Unauthorized")
	}
	p := true
	utils.WorkerPoolData.AddTask(utils.CodeConfig{StopSignal: &p})
	time.Sleep(time.Second * 1)
	return c.SendStatus(200)
}

func GetPRList(c fiber.Ctx) error {
	if c.Get("X-Internal-Key") != utils.INTERNAL_KEY {
		return c.Status(fiber.StatusUnauthorized).SendString("Unauthorized")
	}
	prs, err := gh.GetAllPRs(context.Background(), nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString(fmt.Sprintf("Error fetching PR list: %v", err))
	}
	return c.Status(fiber.StatusOK).JSON(prs)
}

func MergePR(c fiber.Ctx) error {
	if c.Get("X-Internal-Key") != utils.INTERNAL_KEY {
		return c.Status(fiber.StatusUnauthorized).SendString("Unauthorized")
	}
	type RequestBody struct {
		PRNumber int `json:"pr_number"`
	}
	var body RequestBody
	b := c.Body()
	err := json.Unmarshal(b, &body)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("Invalid request body")
	}
	err = gh.MergeBotPR(context.Background(), utils.GhClient, body.PRNumber)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString(fmt.Sprintf("Error merging PR: %v", err))
	}
	return c.SendStatus(200)
}

// StartService initializes the Fiber app, sets up the API routes, and starts the server to listen for incoming requests
// The function also prints out information about the service, including the total number of handlers, the process ID, and the worker pool size
// The server listens on port 6969 and is configured to disable the startup message for a cleaner output
func StartService() {
	os.Setenv("FIBER_NO_BANNER", "true")
	app := fiber.New(fiber.Config{
		AppName:           "Executor Service",
		ServerHeader:      "executor-service",
		BodyLimit:         10 * 1024 * 1024,
		ReadTimeout:       5 * time.Second,
		WriteTimeout:      5 * time.Second,
		IdleTimeout:       30 * time.Second,
		Concurrency:       100000,
		ReduceMemoryUsage: true,
	})
	fmt.Printf(`
   ______          __        ______                 __            
  / ____/___  ____/ /__     / ____/___  ____  _____/ /_____  _____
 / /   / __ \/ __  / _ \   / __/ / __ \/ __ \/ ___/ __/ __ \/ ___/
/ /___/ /_/ / /_/ /  __/  / /___/ / / / /_/ / /__/ /_/ /_/ / /    
\____/\____/\__,_/\___/  /_____/_/ /_/\____/\___/\__/\____/_/     

--------------------------------------------------
`+utils.Lime+`INFO`+utils.Reset+` Code Executor Service started on:`+utils.Blue+` http://127.0.0.1:6969`+utils.Reset+`
`+utils.Lime+`INFO`+utils.Reset+` Total handlers:            %d
`+utils.Lime+`INFO`+utils.Reset+` PID:                       %d
`+utils.Lime+`INFO`+utils.Reset+` Total process count:       1
`+utils.Lime+`INFO`+utils.Reset+` Worker pool size:          %d
--------------------------------------------------
`, utils.CustomWorkerPoolSize+7, os.Getpid(), utils.CustomWorkerPoolSize)
	app.Post("/go/api/queue", AddToQueue)
	app.Get("/info", GetTaskInfo)
	app.Post("/api/admin/problem", SaveProblem)
	app.Get("/api/internal/spawn", SpawnOneWorker)
	app.Get("/api/internal/stop", StopAnyOneWorker)
	app.Get("/api/internal/prs", GetPRList)
	app.Post("/api/internal/merge", MergePR)
	log.Fatal(app.Listen(":6969", fiber.ListenConfig{DisableStartupMessage: true}))
}
