// Copyright (c) 2026 EleventhHour. All rights reserved.
//
// This code is licensed under the MIT License. You may obtain a copy of the License at
//
//	https://opensource.org/licenses/MIT
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and
// limitations under the License.
package main

import (
	"context"
	"executor-service/api"
	"executor-service/database"
	"executor-service/queue"
	"executor-service/utils"
	"executor-service/worker"
	"fmt"
	"io"
	"log"
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
			log.Println("Warning: Could not load .env file:", err)
		} else {
			log.Println("Loaded environment variables from .env done")
		}
	} else {
		log.Println(".env file not found, assuming environment variables are set by the host")
	}
}

// installImage pulls the specified Docker image from the registry, allowing the code executor service to use it for executing code tasks in containers
// The function creates a Docker client, pulls the image, and discards the output to ensure that the image is available for use by the worker containers
func installImage(img string) error {
	fmt.Println("Pulling Image - ", img)
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

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	loadEnv()

	utils.REDIS_ADDR = os.Getenv("REDIS_ADDR")
	utils.MONGO_URI = os.Getenv("MONGO_URI")

	defer cancel()
	err := checkImage()
	if err != nil {
		installImage("gcc:13")
	}
	database.InitMongoDB()
	queue.InitRedis()

	go queue.ListenForTasks(ctx)
	go api.StartService()

	time.Sleep(1 * time.Second)
	go worker.SpawnWorkers(ctx)
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)

	<-sigCh
	fmt.Println("Shutting down gracefully...")
	fmt.Println("Stopping all workers and cleaning up containers...")
	err = worker.KillAllContainers(ctx)
	if err != nil {
		fmt.Println("Error occurred while shutting down:", err)
		cancel()
		return
	}
	fmt.Println("Shutdown complete.")
	cancel()
}
