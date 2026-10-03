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

// KeepXWorkers adjusts the number of active worker goroutines to match the specified count (n).
// Scaling up is parallelized for rapid ramp-up, while scaling down emits exact stop signals without flooding the channel.
func KeepXWorkers(n int) {
	utils.WorkerPoolData.ScalingMuLock()
	defer utils.WorkerPoolData.ScalingMuUnlock()

	currentWorkers := utils.WorkerPoolData.GetCount()
	if currentWorkers == n {
		return
	}

	if currentWorkers < n {
		needed := n - currentWorkers
		for i := 0; i < needed; i++ {
			worker.SpawnWorkerFailed(utils.WorkerCTX)
		}
		// Allow a brief buffer for workers to initialize
		time.Sleep(150 * time.Millisecond)
	} else if currentWorkers > n {
		excess := currentWorkers - n
		p := true
		// Send exactly 'excess' stop signals without looping or over-killing workers
		for i := 0; i < excess; i++ {
			utils.WorkerPoolData.AddTask(utils.CodeConfig{StopSignal: &p})
		}
		// Brief pause so stop signals are ingested by free workers
		time.Sleep(500 * time.Millisecond)
	}
}

// Auto continuously monitors the workload and automatically scales workers up or down.
// It accounts for both task arrival rate and queue backlog, with cooldown protection against scale-down thrashing.
func Auto() {
	const (
		minWorkers     = 4
		maxWorkers     = 100
		checkInterval  = 5 * time.Second
		disabledSleep  = 15 * time.Second
		cooldownCycles = 4 // 4 cycles * 5s = 20s sustained low load required before scale-down
	)

	lowLoadCycles := 0
	lastCount := utils.TaskInfo.GetTotalTasksSubmitted()

	for {
		if !utils.WorkerPoolData.GetAuto() {
			time.Sleep(disabledSleep)
			continue
		}

		time.Sleep(checkInterval)

		if !utils.WorkerPoolData.GetAuto() {
			continue
		}

		currentCount := utils.TaskInfo.GetTotalTasksSubmitted()
		tasksInPeriod := currentCount - lastCount
		lastCount = currentCount

		queueLength := utils.WorkerPoolData.GetChannelLength()
		currentWorkers := utils.WorkerPoolData.GetCount()

		// 1. Demand based on incoming arrival rate (e.g. tasks in last 5s)
		// Assuming 1 worker can process ~1 task/sec, in 5s each worker processes ~5 tasks.
		rateWorkers := (tasksInPeriod + 4) / 4

		// 2. Demand based on current queue backlog (to drain queued tasks swiftly)
		backlogWorkers := (queueLength + 2) / 2

		target := rateWorkers
		if backlogWorkers > target {
			target = backlogWorkers
		}

		if target < minWorkers {
			target = minWorkers
		}
		if target > maxWorkers {
			target = maxWorkers
		}

		if target > currentWorkers {
			// SCALE UP: Immediate and proactive
			lowLoadCycles = 0
			KeepXWorkers(target)
		} else if target < currentWorkers {
			// SCALE DOWN: Conservative with cooldown to prevent oscillation/sawtooth
			lowLoadCycles++
			if lowLoadCycles >= cooldownCycles && queueLength == 0 {
				lowLoadCycles = 0
				KeepXWorkers(target)
			}
		} else {
			lowLoadCycles = 0
		}
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

		time.Sleep(time.Minute * 10)
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
