package main

import (
	"context"
	"executor-service/api"
	"executor-service/docker"
	"executor-service/worker"
	"fmt"
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
	fmt.Println("Shutting down gracefully...")
	fmt.Println("Stopping all workers and cleaning up containers...")
	err := worker.KillAllContainers(ctx)
	if err != nil {
		fmt.Println("Error occurred while shutting down:", err)
		cancel()
		return
	}
	fmt.Println("Shutdown complete.")
	cancel()
}
