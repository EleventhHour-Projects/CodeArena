package api

import (
	"executor-service/utils"
	"executor-service/worker"
	"time"
)

// KeepXWorkers adjusts the number of active worker goroutines to match the specified count,
// allowing for dynamic scaling of worker resources based on the current workload in the code execution service
// If the current number of workers is less than the desired count, it spawns additional workers until the desired count is reached.
// If the current number of workers is greater than the desired count, it sends stop signals to excess workers to gracefully reduce the worker pool size,
// ensuring efficient resource utilization and optimal performance in handling code execution tasks.
func KeepXWorkers(n int) {
	currentWorkers := utils.WorkerPoolData.GetCount()
	if currentWorkers < n {
		for i := 0; i < n-currentWorkers; i++ {
			worker.SpawnWorkerFailed(utils.WorkerCTX)
		}
	} else if currentWorkers > n {
		for i := 0; i < currentWorkers-n; i++ {
			p := true
			utils.WorkerPoolData.AddTask(utils.CodeConfig{StopSignal: &p})
			time.Sleep(time.Second * 1)
		}
	}
}

// Auto continuously monitors the workload of the code execution service and automatically adjusts
// the number of active worker goroutines based on the number of tasks processed in a given time period,
// allowing for dynamic scaling of worker resources to efficiently handle varying workloads and optimize performance in the code execution service
// The function runs in a loop, checking for the auto-scaling flag and calculating the number of tasks processed in a defined time interval,
// then adjusts the worker pool size accordingly using the KeepXWorkers function to ensure efficient resource utilization and optimal performance in handling code execution tasks.
func Auto() {
	for {
		if !utils.WorkerPoolData.GetAuto() {
			time.Sleep(time.Second * 2)
			continue
		}

		initalCount := utils.TaskInfo.GetTotalTasks()
		time.Sleep(time.Second * 10)

		if !utils.WorkerPoolData.GetAuto() {
			continue
		}

		finalCount := utils.TaskInfo.GetTotalTasks()
		tasksInPeriod := finalCount - initalCount

		if tasksInPeriod >= 0 && tasksInPeriod <= 20 {
			KeepXWorkers(1)
		} else if tasksInPeriod > 20 && tasksInPeriod <= 40 {
			KeepXWorkers(2)
		} else if tasksInPeriod > 40 && tasksInPeriod <= 60 {
			KeepXWorkers(3)
		} else if tasksInPeriod > 60 && tasksInPeriod <= 80 {
			KeepXWorkers(4)
		} else if tasksInPeriod > 80 && tasksInPeriod <= 100 {
			KeepXWorkers(5)
		} else if tasksInPeriod > 100 && tasksInPeriod <= 120 {
			KeepXWorkers(6)
		} else if tasksInPeriod > 120 && tasksInPeriod <= 140 {
			KeepXWorkers(7)
		} else if tasksInPeriod > 140 && tasksInPeriod <= 160 {
			KeepXWorkers(8)
		} else if tasksInPeriod > 160 && tasksInPeriod <= 180 {
			KeepXWorkers(9)
		} else if tasksInPeriod > 180 {
			KeepXWorkers(10)
		}
	}
}
