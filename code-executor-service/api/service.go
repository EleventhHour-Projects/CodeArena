package api

import (
	"encoding/json"
	"executor-service/utils"
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
INFO Code Executor Service started on: http://127.0.0.1:6969
INFO Total handlers:            %d
INFO PID:                       %d
INFO Total process count:       1
INFO Worker pool size:          %d
--------------------------------------------------
`, utils.WORKER_POOL_SIZE, os.Getpid(), utils.WORKER_POOL_SIZE)
	app.Post("/go/api/queue", AddToQueue)
	log.Fatal(app.Listen(":6969", fiber.ListenConfig{DisableStartupMessage: true}))
}
