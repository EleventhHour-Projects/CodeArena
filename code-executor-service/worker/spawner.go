package worker

import (
	"context"
	"executor-service/utils"

	"github.com/moby/moby/client"
)

// SpawnWorkers is a function that spawns a specified number of worker goroutines to process code execution tasks from the worker pool.
// It takes a context as an argument, which can be used to manage the lifecycle of the worker goroutines and allow for graceful shutdown when needed.
// The number of workers spawned is determined by the WORKER_POOL_SIZE constant defined in the utils package, which allows for easy configuration of the worker pool size based on the needs of the application and available resources.
func SpawnWorkers(ctx context.Context) {
	for i := 0; i < utils.CustomWorkerPoolSize; i++ {
		go worker(ctx)
	}
}

// SpawnWorkerFailed is a function that spawns a new worker in a separate goroutine if a worker fails to execute a task.
// This allows the system to maintain the desired number of active workers in the worker pool, ensuring that there are always workers available to process code execution tasks even if some workers encounter errors or issues during execution.
func SpawnWorkerFailed(ctx context.Context) {
	go worker(ctx)
}

// KillAllContainers stops and removes all worker containers that use the configured execution image.
func KillAllContainers(ctx context.Context) error {
	apiClient, err := client.NewClientWithOpts(
		client.FromEnv,
		client.WithAPIVersionNegotiation(),
	)
	if err != nil {
		return err
	}

	containers, err := apiClient.ContainerList(ctx, client.ContainerListOptions{})
	if err != nil {
		return err
	}

	for _, container := range containers.Items {
		if container.Image != utils.ExecutionImage() {
			continue
		}
		_, err := apiClient.ContainerStop(ctx, container.ID, client.ContainerStopOptions{})
		apiClient.ContainerRemove(ctx, container.ID, client.ContainerRemoveOptions{Force: true})
		if err != nil {
			return err
		}
	}
	return nil
}

// KillContainerByID kill a particular container in case of any failiar
func KillContainerByID(ctx context.Context, containerID string) error {
	apiClient, err := client.NewClientWithOpts(
		client.FromEnv,
		client.WithAPIVersionNegotiation(),
	)
	if err != nil {
		return err
	}

	_, err = apiClient.ContainerStop(ctx, containerID, client.ContainerStopOptions{})
	apiClient.ContainerRemove(ctx, containerID, client.ContainerRemoveOptions{Force: true})
	if err != nil {
		return err
	}
	return nil
}
