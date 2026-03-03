package worker

import (
	"context"
	"executor-service/utils"
)

func SpawnWorkers(ctx context.Context) {
	for i := 0; i < utils.WORKER_POOL_SIZE; i++ {
		go worker(ctx)
	}
}

func SpawnWorkerFailed(ctx context.Context) {
	go worker(ctx)
}
