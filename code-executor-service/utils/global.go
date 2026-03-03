package utils

import (
	"errors"
	"sync"
)

const (
	WORKER_POOL_SIZE = 5
)

var REDIS_ADDR string
var REDIS_PASSWORD string
var MONGO_URI string

type CodeConfig struct {
	TaskID    string
	Code      string
	Language  string
	TestCases map[any]any
}

type WorkerPool struct {
	activeWorkerCount int
	mu                sync.Mutex
	channel           chan CodeConfig
}

var WorkerPoolData = &WorkerPool{activeWorkerCount: 0, mu: sync.Mutex{}, channel: make(chan CodeConfig)}

func (wp *WorkerPool) Increment() {
	wp.mu.Lock()
	defer wp.mu.Unlock()
	wp.activeWorkerCount++
}

func (wp *WorkerPool) Decrement() {
	wp.mu.Lock()
	defer wp.mu.Unlock()
	wp.activeWorkerCount--
}

func (wp *WorkerPool) GetCount() int {
	wp.mu.Lock()
	defer wp.mu.Unlock()
	return wp.activeWorkerCount
}

func (wp *WorkerPool) AddTask(task CodeConfig) {
	wp.channel <- task
}

func (wp *WorkerPool) GetTask() CodeConfig {
	return <-wp.channel
}

func ErrorHandler(err error) {
	if err != nil {
		panic(err)
	}
}

func FakeError() error {
	return errors.New("fake error")
}
