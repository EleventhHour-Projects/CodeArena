package utils

import "sync"

// ResetWorkerPool resets a WorkerPool to a clean zero state.
// Only intended for use in tests.
func ResetWorkerPool(wp *WorkerPool) {
	wp.mu = sync.Mutex{}
	wp.muauto = sync.Mutex{}
	wp.scalingMu = sync.Mutex{}
	wp.activeWorkerCount = 0
	wp.auto = false
	wp.ActiveTasks = make(map[string]*CodeConfig)
}

// InitWorkerPoolChannel initialises the internal channel with the given buffer size.
// Only intended for use in tests.
func InitWorkerPoolChannel(wp *WorkerPool, bufSize int) {
	wp.channel = make(chan CodeConfig, bufSize)
}
