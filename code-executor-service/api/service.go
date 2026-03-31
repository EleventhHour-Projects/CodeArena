package api

import (
	"context"
	"encoding/json"
	"executor-service/cpu"
	"executor-service/docker"
	"executor-service/gh"
	"executor-service/utils"
	"executor-service/worker"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gofiber/contrib/monitor"
	"github.com/gofiber/fiber/v3"
)

// Temporary function to add tasks to the queue, can be removed when the frontend is ready
// AddToQueue is a handler function that receives a code execution task in the request body, unmarshals it into a CodeConfig struct, and adds it to the worker pool's channel for processing by workers
// The function expects the request body to contain a JSON representation of a CodeConfig struct, which includes the code to be executed and any relevant configuration for the task
// If the request body is invalid or cannot be unmarshaled into a CodeConfig struct, the function returns a 400 Bad Request response with an error message
// If the task is successfully added to the worker pool, the function returns a success message indicating that the task has been added to the queue
func AddToQueue(c fiber.Ctx) error {
	return c.Status(fiber.StatusOK).SendString("This endpoint is deprecated and will be removed in the future. Please use the frontend to submit tasks.")
	// var task utils.CodeConfig
	// b := c.Body()
	// err := json.Unmarshal(b, &task)

	// if err != nil {
	// 	return c.Status(fiber.StatusBadRequest).SendString("Invalid request body")
	// }
	// utils.WorkerPoolData.AddTask(task)
	// return c.SendString("Task added to queue")
}

// GetTaskInfo is a handler function that retrieves information about the task execution, such as the average execution time and total number of tasks processed, and returns it as a JSON response
// The function accesses the TaskInfo struct from the utils package, which contains methods to calculate the average execution time and track the total number of tasks processed by the worker pool
// The response includes the average execution time and total task count, allowing clients to monitor the performance of the task execution service
func GetTaskInfo(c fiber.Ctx) error {
	workerInfo, err := docker.GetWorkerDetails()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Error fetching worker details")
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"average_time_to_execute_task_inSec": utils.TaskInfo.GetAverageTime(),
		"total_tasks":                        utils.TaskInfo.GetTotalTasks(),
		"total_time_to_execute_task_inSec":   utils.TaskInfo.GetTotalTime(),
		"active_worker":                      utils.WorkerPoolData.GetCount(),
		"total_active_time":                  time.Since(utils.StartTime).String(),
		"worker_details":                     workerInfo,
	})
}

// SpawnOneWorker is a handler function that allows authorized clients to spawn a new worker goroutine for processing code execution tasks, providing dynamic scaling of the worker pool based on demand
// The function checks for an internal key in the request header to ensure that only authorized clients can access this endpoint, and it also checks if the service is running in API-only mode, in which case it returns a 403 Forbidden response
// If the request is valid and the service is not in API-only mode, the function calls the SpawnWorkerFailed method from the worker package to spawn a new worker goroutine, and it returns a 200 OK response indicating that the worker has been spawned successfully
func SpawnOneWorker(c fiber.Ctx) error {
	if c.Get("X-Internal-Key") != utils.INTERNAL_KEY {
		return c.Status(fiber.StatusUnauthorized).SendString("Unauthorized")
	}
	if utils.APIOnly {
		return c.Status(fiber.StatusForbidden).SendString("API only mode is enabled")
	}
	worker.SpawnWorkerFailed(utils.WorkerCTX)
	return c.SendStatus(200)
}

// StopAnyOneWorker is a handler function that allows authorized clients to stop any one worker goroutine from the worker pool, providing dynamic control over the worker pool based on demand and resource availability
// The function checks for an internal key in the request header to ensure that only authorized clients can access this endpoint, and it also checks if the service is running in API-only mode, in which case it returns a 403 Forbidden response
// If the request is valid and the service is not in API-only mode, the function checks if there are any active workers in the worker pool, and if so, it adds a stop signal task to the worker pool's channel to signal one worker to stop, and it returns a 200 OK response indicating that a worker has been signaled to stop successfully
// If there are no active workers in the worker pool, the function returns a 400 Bad Request response indicating that there are no workers to stop
func StopAnyOneWorker(c fiber.Ctx) error {
	if c.Get("X-Internal-Key") != utils.INTERNAL_KEY {
		return c.Status(fiber.StatusUnauthorized).SendString("Unauthorized")
	}
	if utils.APIOnly {
		return c.Status(fiber.StatusForbidden).SendString("API only mode is enabled")
	}
	if utils.WorkerPoolData.GetCount() <= 0 {
		return c.Status(fiber.StatusBadRequest).SendString("No workers to stop")
	}
	p := true
	utils.WorkerPoolData.AddTask(utils.CodeConfig{StopSignal: &p})
	time.Sleep(time.Second * 1)
	return c.SendStatus(200)
}

// GetPRList is a handler function that retrieves a list of pull requests from the GitHub repository using the gh package, allowing authorized clients to access information about open pull requests for review and management purposes
// The function checks for an internal key in the request header to ensure that only authorized clients can access this endpoint, and it returns a 401 Unauthorized response if the key is missing or invalid
// If the request is valid, the function calls the GetAllPRs method from the gh package to fetch the list of pull requests, and it returns the list as a JSON response with a 200 OK status
// If there is an error while fetching the pull request list, the function returns a 500 Internal Server Error response with an error message indicating the issue
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

// MergePR is a handler function that allows authorized clients to merge specified pull requests in the GitHub repository using the gh package, facilitating the management and integration of code changes through pull request merges
// The function checks for an internal key in the request header to ensure that only authorized clients can access this endpoint, and it returns a 401 Unauthorized response if the key is missing or invalid
// The function expects the request body to contain a JSON object with a "pr_number" field, which is an array of integers representing the pull request numbers to be merged
// If the request body is invalid or cannot be unmarshaled into the expected format, the function returns a 400 Bad Request response with an error message indicating the issue
// If the request is valid, the function calls the MergeBotPR method from the gh package to merge the specified pull requests, and it returns a 200 OK response if the merge operation is successful, or a 500 Internal Server Error response if there is an error during the merge process
func MergePR(c fiber.Ctx) error {
	if c.Get("X-Internal-Key") != utils.INTERNAL_KEY {
		return c.Status(fiber.StatusUnauthorized).SendString("Unauthorized")
	}
	type RequestBody struct {
		PRNumber []int `json:"pr_number"`
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

// SetAuto is a handler function that allows authorized clients to enable or disable the auto-scaling feature of the worker pool, providing dynamic control over the worker pool's behavior based on demand and resource availability
// The function checks for an internal key in the request header to ensure that only authorized clients can access this endpoint, and it also checks if the service is running in API-only mode, in which case it returns a 403 Forbidden response
// The function expects the request body to contain a JSON object with an "auto" field, which is a boolean value indicating whether to enable or disable auto-scaling for the worker pool
// If the request body is invalid or cannot be unmarshaled into the expected format, the function returns a 400 Bad Request response with an error message indicating the issue
// If the request is valid, the function updates the auto-scaling setting in the WorkerPoolData struct and returns a 200 OK response indicating that the auto-scaling setting has been updated successfully
func SetAuto(c fiber.Ctx) error {
	if c.Get("X-Internal-Key") != utils.INTERNAL_KEY {
		return c.Status(fiber.StatusUnauthorized).SendString("Unauthorized")
	}
	if utils.APIOnly {
		return c.Status(fiber.StatusForbidden).SendString("API only mode is enabled")
	}
	type RequestBody struct {
		Auto bool `json:"auto"`
	}
	var body RequestBody
	b := c.Body()
	err := json.Unmarshal(b, &body)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("Invalid request body")
	}
	utils.WorkerPoolData.SetAuto(body.Auto)
	return c.SendStatus(200)
}

// GetAutoStatus is a handler function that allows authorized clients to check the current status of the auto-scaling feature for the worker pool, providing visibility into whether auto-scaling is enabled or disabled
// The function checks for an internal key in the request header to ensure that only authorized clients can access this endpoint, and it also checks if the service is running in API-only mode, in which case it returns a 403 Forbidden response
// If the request is valid, the function retrieves the current auto-scaling status from the WorkerPoolData struct and returns it as a JSON response with a 200 OK status, allowing clients to monitor the auto-scaling setting of the worker pool
func GetAutoStatus(c fiber.Ctx) error {
	if c.Get("X-Internal-Key") != utils.INTERNAL_KEY {
		return c.Status(fiber.StatusUnauthorized).SendString("Unauthorized")
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"auto": utils.WorkerPoolData.GetAuto(),
	})
}

// GetServerUsageInfo is a handler function that allows authorized clients to retrieve information about the server's resource usage, such as CPU and memory usage, providing insights into the performance and resource utilization of the code execution service
// The function checks for an internal key in the request header to ensure that only authorized clients can access this endpoint, and it returns a 401 Unauthorized response if the key is missing or invalid
// If the request is valid, the function calls methods from the cpu package to get the current CPU and memory usage of the server, and it returns this information as a JSON response with a 200 OK status
// If there is an error while retrieving the CPU or memory usage, the function returns "N/A" for the respective field in the response, allowing clients to still receive some information about the server's resource usage even if there are issues with fetching the data
func GetServerUsageInfo(c fiber.Ctx) error {
	if c.Get("X-Internal-Key") != utils.INTERNAL_KEY {
		return c.Status(fiber.StatusUnauthorized).SendString("Unauthorized")
	}
	// Placeholder for actual server usage info, such as CPU and memory usage
	cpuUsage, err := cpu.GetCPUUsage()
	if err != nil {
		cpuUsage = "N/A"
	}
	memoryUsage, err := cpu.GetMemoryUsage()
	if err != nil {
		memoryUsage = "N/A"
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"cpu_usage":    cpuUsage,
		"memory_usage": memoryUsage,
	})
}

// ServerPID is a handler function that allows authorized clients to retrieve the process ID (PID) of the main server process, providing visibility into the server's process information for monitoring and management purposes
// The function checks for an internal key in the request header to ensure that only authorized clients can access this endpoint, and it returns a 401 Unauthorized response if the key is missing or invalid
// If the request is valid, the function retrieves the main process ID from the MainProcessID variable and returns it as a JSON response with a 200 OK status, allowing clients to identify the server's main process for monitoring or debugging purposes
func ServerPID(c fiber.Ctx) error {
	if c.Get("X-Internal-Key") != utils.INTERNAL_KEY {
		return c.Status(fiber.StatusUnauthorized).SendString("Unauthorized")
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"pid": utils.MainProcessID,
	})
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
`, utils.CustomWorkerPoolSize+12, utils.MainProcessID, utils.CustomWorkerPoolSize)
	app.Post("/go/api/queue", AddToQueue) // Deprecated endpoint for adding tasks to the queue, will be removed in the future
	app.Get("/info", GetTaskInfo)
	app.Post("/api/admin/problem", SaveProblem)
	app.Get("/api/internal/spawn", SpawnOneWorker)
	app.Get("/api/internal/stop", StopAnyOneWorker)
	app.Get("/api/internal/prs", GetPRList)
	app.Post("/api/internal/merge", MergePR)
	app.Post("/api/internal/auto", SetAuto)
	app.Get("/api/internal/auto", GetAutoStatus)
	app.Get("/api/internal/usage", GetServerUsageInfo)
	app.Get("/api/internal/pid", ServerPID)
	app.Get("/metrics", monitor.New(monitor.Config{Title: "ParkProof Go Backend Monitor"}))
	log.Fatal(app.Listen(":6969", fiber.ListenConfig{DisableStartupMessage: true}))
}
