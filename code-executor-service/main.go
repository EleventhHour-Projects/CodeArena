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
	"executor-service/worker"
	"fmt"
	"io"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/moby/moby/client"
)

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
	defer reader.Close()

	io.Copy(io.Discard, reader)
	return nil
}

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	err := checkImage()
	if err != nil {
		installImage("gcc:13")
	}
	database.InitMongoDB()
	// Uncomment the following lines to enable Redis queue functionality
	//queue.InitRedis()
	//go queue.ListenForTasks(ctx)
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
