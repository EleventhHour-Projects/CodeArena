package worker

import (
	"context"
	"executor-service/utils"

	"github.com/moby/moby/client"
)

func SpawnWorkers(ctx context.Context) {
	for i := 0; i < utils.WORKER_POOL_SIZE; i++ {
		go worker(ctx)
	}
}

func SpawnWorkerFailed(ctx context.Context) {
	go worker(ctx)
}

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
		_, err := apiClient.ContainerStop(ctx, container.ID, client.ContainerStopOptions{})
		apiClient.ContainerRemove(ctx, container.ID, client.ContainerRemoveOptions{Force: true})
		if err != nil {
			return err
		}
	}
	return nil
}
