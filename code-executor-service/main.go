package main

import (
	"context"
	"executor-service/api"
	"executor-service/docker"
	"executor-service/worker"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	docker.InitDocker()
	go api.StartService()
	time.Sleep(1 * time.Second)
	go worker.SpawnWorkers(ctx)

	// Wait for shutdown signal
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)

	<-sigCh
	cancel()
}
