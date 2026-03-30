// Copyright (c) 2026 EleventhHour. All rights reserved.
//
// This code is licensed under the MIT License. You may obtain a copy of the License at
//
//	https://opensource.org/licenses/MIT
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and
// limitations under the License.

// To run the code executor service, use the command: `go run main.go -worker=5`
// The -worker flag allows you to specify the number of worker goroutines to spawn for processing code execution tasks. If not provided, it defaults to 3.
//
// The main function initializes the code executor service by loading environment variables, checking for the required Docker image, initializing database and queue connections, and starting the API service and worker pool.
// It also sets up a signal handler to gracefully shut down the service when an interrupt signal is received, ensuring that all worker containers are stopped and cleaned up properly.
package main

import (
	"context"
	"executor-service/api"
	"executor-service/database"
	"executor-service/gh"
	"executor-service/queue"
	"executor-service/utils"
	"executor-service/websocket"
	"executor-service/worker"
	"flag"
	"fmt"
	"io"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/moby/moby/client"
)

// checkImage checks if the required Docker image (gcc:13) is available locally, ensuring that the worker containers can use it for executing code tasks
// If the image is not found, it returns an error, prompting the main function to pull the image from the registry
func checkImage() error {
	apiClient, err := client.NewClientWithOpts(
		client.FromEnv,
		client.WithAPIVersionNegotiation(),
	)
	if err != nil {
		return err
	}
	imgs, err := apiClient.ImageList(context.Background(), client.ImageListOptions{})
	if err != nil {
		return err
	}
	found := false
	for _, img := range imgs.Items {
		if img.RepoTags[0] == "gcc:13" {
			found = true
		}
	}
	if found == true {
		return nil
	}
	return fmt.Errorf("no gcc:13 found")
}

// loadEnv loads environment variables from a .env file if it exists, allowing the application to use configuration values defined in the file for connecting to services like MongoDB and Redis
// If the .env file is not found, it assumes that the necessary environment variables are set by the host environment and logs a warning message
func loadEnv() {
	if _, err := os.Stat(".env"); err == nil {
		if err := godotenv.Load(); err != nil {
			fmt.Println("Warning: Could not load .env file:", err)
		} else {
			fmt.Println(utils.Green + "Loaded environment variables from .env done" + utils.Reset)
		}
	} else {
		fmt.Println(utils.Red+"Warning:"+utils.Reset, ".env file not found, assuming environment variables are set by the host")
	}
}

// installImage pulls the specified Docker image from the registry, allowing the code executor service to use it for executing code tasks in containers
// The function creates a Docker client, pulls the image, and discards the output to ensure that the image is available for use by the worker containers
func installImage(img string) error {
	fmt.Println(utils.Green+"Pulling Image - "+utils.Reset, img)
	apiClient, err := client.NewClientWithOpts(
		client.FromEnv,
		client.WithAPIVersionNegotiation(),
	)
	if err != nil {
		return err
	}
	reader, err := apiClient.ImagePull(context.Background(), img, client.ImagePullOptions{})
	if err != nil {
		return err
	}

	defer reader.Close()

	io.Copy(io.Discard, reader)
	return nil
}

// To run the code executor service, use the command: `go run main.go -worker=5`
func main() {
	// Parse command-line flags for worker pool size, allowing users to specify the number of worker goroutines to spawn for processing code execution tasks.
	// If the flag is not provided or is set to a non-positive value, the application will default to using the WORKER_POOL_SIZE constant defined in the utils package.
	workerCount := flag.Int("worker", 0, "number of workers to spawn (optional)")
	apiOnly := flag.Bool("api", false, "for starting server only in API mode")
	flag.Usage = utils.FlagUsage
	flag.Parse()
	utils.MainProcessID = os.Getpid()
	utils.CustomWorkerPoolSize = *workerCount

	if *apiOnly {
		utils.APIOnly = true
		fmt.Println(utils.Yellow + "Starting in API only mode. Worker related endpoints will be disabled." + utils.Reset)
	} else {
		utils.APIOnly = false
	}

	if utils.CustomWorkerPoolSize <= 0 && !*apiOnly {
		utils.CustomWorkerPoolSize = utils.WORKER_POOL_SIZE
	}
	// WARING if Worker Pool Size set above 100
	// As it can result in high resourse usage
	if utils.CustomWorkerPoolSize > 100 {
		fmt.Printf("\033[31m⚠ WARNING:\033[0m Worker count (%d) is very high and may exhaust system resources.\n", utils.CustomWorkerPoolSize)
		fmt.Print("Do you want to continue? (y/N): ")

		var input string
		fmt.Scanln(&input)

		// Confirmation Prompt for proceeding ahead
		if input != "y" && input != "Y" {
			fmt.Println(utils.Red + "Aborting startup." + utils.Reset)
			os.Exit(1)
		}
	}
	utils.StartTime = time.Now()
	// Context for whole service
	ctx, cancel := context.WithCancel(context.Background())
	utils.WorkerCTX = ctx

	// Loading environment variables
	loadEnv()
	utils.REDIS_ADDR = os.Getenv("REDIS_ADDR")
	utils.MONGO_URI = os.Getenv("MONGO_URI")
	utils.GITHUB_TOKEN = os.Getenv("GITHUB_TOKEN")
	utils.INTERNAL_KEY = os.Getenv("INTERNAL_KEY")
	utils.WSSIP = os.Getenv("WSSIP")
	if utils.WSSIP == "" {
		fmt.Println(utils.Red + "WSSIP not set" + utils.Reset)
		utils.WSSIP = "http://localhost:6767/internal/event"
	}

	defer cancel()
	if !*apiOnly {
		err := checkImage()
		if err != nil {
			// Pulling gcc image (for c++)
			installImage("gcc:13")
		}
	}

	// MongoDB and Redis initilization
	database.InitMongoDB()
	if !*apiOnly {
		queue.InitRedis()

		// Listing for data in redis queue
		go queue.ListenForTasks(ctx)
		go websocket.ListForEvents(ctx)
	}
	// API service starting
	go api.StartService()
	// Initialize GitHub Client
	gh.InitGH()

	if !*apiOnly {
		// Give a buffer time to start process of spawing workers
		time.Sleep(1 * time.Second)
		go worker.SpawnWorkers(ctx)
		time.Sleep(1 * time.Second)
		// Start Auto Scaling
		// Default : False, can be enabled by API
		go api.Auto()
	}

	// Exit Process (Ctrl + C)
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)

	<-sigCh
	fmt.Println(utils.Cyan + "Shutting down gracefully..." + utils.Reset)
	if !*apiOnly {
		fmt.Println(utils.Cyan + "Stopping all workers and cleaning up containers..." + utils.Reset)
		if err := worker.KillAllContainers(ctx); err != nil {
			fmt.Println(utils.Red+"Error occurred while shutting down:"+utils.Reset, err)
			cancel()
			return
		}
	}
	fmt.Println(utils.Yellow + "Shutdown complete." + utils.Reset)
	cancel()
}
