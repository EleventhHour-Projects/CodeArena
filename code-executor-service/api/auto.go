package api

import (
	"context"
	"executor-service/database"
	"executor-service/docker"
	"executor-service/utils"
	"executor-service/worker"
	"fmt"
	"time"
)

// KeepXWorkers adjusts the number of active worker goroutines to match the specified count,
// allowing for dynamic scaling of worker resources based on the current workload in the code execution service.
// It uses a scaling mutex to ensure that multiple scaling operations do not conflict.
func KeepXWorkers(n int) {
	utils.WorkerPoolData.ScalingMuLock() // Using a helper for cleaner code or direct lock
	defer utils.WorkerPoolData.ScalingMuUnlock()

	for {
		currentWorkers := utils.WorkerPoolData.GetCount()
		if currentWorkers == n {
			break
		}

		if currentWorkers < n {
			// Spawn one worker and re-check
			worker.SpawnWorkerFailed(utils.WorkerCTX)
			// Wait a tiny bit for the worker to increment the count
			time.Sleep(time.Millisecond * 100)
		} else if currentWorkers > n {
			// Stop one worker and re-check
			p := true
			utils.WorkerPoolData.AddTask(utils.CodeConfig{StopSignal: &p})
			// Sleep to allow the worker to receive the signal and decrement the count
			time.Sleep(time.Second * 1)
		}
	}
}

// Auto continuously monitors the workload of the code execution service and automatically adjusts
// the number of active worker goroutines based on the number of tasks processed in a given time period.
func Auto() {
	for {
		if !utils.WorkerPoolData.GetAuto() {
			time.Sleep(time.Minute * 1)
			continue
		}

		initalCount := utils.TaskInfo.GetTotalTasks()
		time.Sleep(time.Second * 10)

		if !utils.WorkerPoolData.GetAuto() {
			continue
		}

		finalCount := utils.TaskInfo.GetTotalTasks()
		tasksInPeriod := finalCount - initalCount

		target := 1
		if tasksInPeriod > 180 {
			target = 10
		} else if tasksInPeriod > 0 {
			target = (tasksInPeriod / 20) + 1
			if target > 10 {
				target = 10
			}
		}

		KeepXWorkers(target)
	}
}

// AutoClean continuously monitors the resource usage of worker containers and automatically replaces
// containers that exceed defined CPU or memory usage thresholds.
func AutoClean() {
	for {
		if !utils.WorkerPoolData.GetAuto() {
			time.Sleep(time.Minute * 1)
			continue
		}
		intital, _ := docker.GetWorkerDetails()
		time.Sleep(time.Minute * 1)
		if !utils.WorkerPoolData.GetAuto() {
			continue
		}
		final, _ := docker.GetWorkerDetails()

		for _, workerf := range final {
			for _, workeri := range intital {
				if workerf.ID == workeri.ID {
					overThreshold := false
					if workerf.CPUUsage > 80.0 && workeri.CPUUsage > 80.0 {
						overThreshold = true
					} else if workerf.MemoryUsage > workerf.MemoryLimit*80/100 && workeri.MemoryUsage > workeri.MemoryLimit*80/100 {
						overThreshold = true
					}

					if overThreshold {
						utils.WorkerPoolData.ScalingMuLock()
						fmt.Printf("AutoClean: Replacing over-threshold container %s (CPU: %.2f%%, Mem: %d bytes)\n", workerf.ID, workerf.CPUUsage, workerf.MemoryUsage)

						// 1. Rescue task if worker was busy
						task := utils.WorkerPoolData.StealActiveTask(workerf.ID)
						if task == nil {
							// For idle workers, we must unregister them explicitly
							utils.WorkerPoolData.UnregisterWorker(workerf.ID)
						}

						// 2. Perform the replacement
						worker.KillContainerByID(utils.WorkerCTX, workerf.ID)
						worker.SpawnWorkerFailed(utils.WorkerCTX)

						// 3. Release the scaling lock BEFORE task re-queuing
						utils.WorkerPoolData.ScalingMuUnlock()

						// 4. Re-queue the rescued task (if any)
						if task != nil {
							fmt.Printf("AutoClean: Rescuing task %s from container %s\n", task.TaskID, workerf.ID)
							utils.WorkerPoolData.AddTask(*task)
						}
					}
				}
			}
		}
	}
}

func FetchInviteFromDatabase() {
	ticker := time.NewTicker(time.Second * 5)
	defer ticker.Stop()
	ctx := context.Background()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			invites, err := database.MongoDB.GetAllInvites()
			if err != nil {
				continue
			}
			utils.InviteStore.AddInvite(invites)
		}
	}
}
