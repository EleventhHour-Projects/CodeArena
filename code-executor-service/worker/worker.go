package worker

import (
	"context"
	"executor-service/utils"
	"fmt"

	"github.com/moby/moby/api/types/container"
	"github.com/moby/moby/client"
)

func RunTask(ctx context.Context) error {

	return nil
}

func worker(ctx context.Context) {

	utils.WorkerPoolData.Increment()
	defer utils.WorkerPoolData.Decrement()
	fmt.Println("Worker started - Active Workers:", utils.WorkerPoolData.GetCount())
	apiClient, err := client.NewClientWithOpts(
		client.FromEnv,
		client.WithAPIVersionNegotiation(),
	)
	if err != nil {
		fmt.Println("Docker client error:", err)
		return
	}
	defer apiClient.Close()
	PidL := int64(64)
	imageName := "gcc:13"
	resp, err := apiClient.ContainerCreate(ctx, client.ContainerCreateOptions{
		Image: imageName,
		HostConfig: &container.HostConfig{
			Resources: container.Resources{
				Memory:    256 * 1024 * 1024, // 256MB
				NanoCPUs:  1e9,               // 1 CPU
				PidsLimit: &PidL,
			},
			NetworkMode:    "none",
			ReadonlyRootfs: true,
		},
		Config: &container.Config{Cmd: []string{"tail", "-f", "/dev/null"}},
	})
	if err != nil {
		panic(err)
	}

	if _, err := apiClient.ContainerStart(ctx, resp.ID, client.ContainerStartOptions{}); err != nil {
		panic(err)
	}

	fmt.Println(resp.ID)
	for {
		task := utils.WorkerPoolData.GetTask()
		fmt.Println("Worker received task:", task.TaskID)
		runCtx := context.Background()
		err := RunTask(runCtx)
		if err != nil {
			fmt.Println("Worker failed task:", task.TaskID, "Error:", err, "Spawning new worker")
			SpawnWorkerFailed(ctx)
			break
		} else {
			fmt.Println("Worker completed task:", task.TaskID)
		}
	}
}
