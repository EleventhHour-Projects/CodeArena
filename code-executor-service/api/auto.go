package api

import (
	"executor-service/utils"
	"executor-service/worker"
	"time"
)

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
