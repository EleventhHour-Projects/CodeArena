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
