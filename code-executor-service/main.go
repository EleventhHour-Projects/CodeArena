package main

import (
	"context"
	"executor-service/docker"
	"executor-service/worker"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	docker.InitDocker()
	go worker.SpawnWorkers(ctx)

	// Wait for shutdown signal
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)

	<-sigCh
	cancel()
}
