package docker

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/moby/moby/client"
)

type WorkerDetail struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Image       string  `json:"image"`
	State       string  `json:"state"`
	Status      string  `json:"status"`
	CPUUsage    float64 `json:"cpu_usage"`    // Percentage
	MemoryUsage uint64  `json:"memory_usage"` // Bytes
	MemoryLimit uint64  `json:"memory_limit"` // Bytes
}

type containerStats struct {
	CPUStats struct {
		CPUUsage struct {
			TotalUsage uint64 `json:"total_usage"`
		} `json:"cpu_usage"`
		SystemUsage uint64 `json:"system_cpu_usage"`
		OnlineCPUs  uint32 `json:"online_cpus"`
	} `json:"cpu_stats"`
	PreCPUStats struct {
		CPUUsage struct {
			TotalUsage uint64 `json:"total_usage"`
		} `json:"cpu_usage"`
		SystemUsage uint64 `json:"system_cpu_usage"`
	} `json:"precpu_stats"`
	MemoryStats struct {
		Usage uint64 `json:"usage"`
		Limit uint64 `json:"limit"`
	} `json:"memory_stats"`
}

func fetchStats(apiClient *client.Client, containerID string) (*containerStats, error) {
	statsResp, err := apiClient.ContainerStats(context.Background(), containerID, client.ContainerStatsOptions{Stream: false})
	if err != nil {
		return nil, err
	}
	defer statsResp.Body.Close()

	var stats containerStats
	decoder := json.NewDecoder(statsResp.Body)
	if err := decoder.Decode(&stats); err != nil {
		return nil, err
	}
	return &stats, nil
}

func GetWorkerDetails() ([]WorkerDetail, error) {
	apiClient, err := client.NewClientWithOpts(
		client.FromEnv,
		client.WithAPIVersionNegotiation(),
	)
	if err != nil {
		return nil, err
	}
	defer apiClient.Close()

	containers, err := apiClient.ContainerList(context.Background(), client.ContainerListOptions{})
	if err != nil {
		return nil, err
	}

	var targets []string
	var targetInfos map[string]WorkerDetail = make(map[string]WorkerDetail)

	for _, container := range containers.Items {
		if container.Image == "gcc:13" {
			name := ""
			if len(container.Names) > 0 {
				name = container.Names[0]
			}
			targets = append(targets, container.ID)
			targetInfos[container.ID] = WorkerDetail{
				ID:     container.ID,
				Name:   name,
				Image:  container.Image,
				State:  string(container.State),
				Status: string(container.Status),
			}
		}
	}

	if len(targets) == 0 {
		return []WorkerDetail{}, nil
	}

	// Fetch Initial Stats
	initialStats := make(map[string]*containerStats)
	var mu sync.Mutex
	var wg sync.WaitGroup

	for _, id := range targets {
		wg.Add(1)
		go func(cid string) {
			defer wg.Done()
			s, err := fetchStats(apiClient, cid)
			if err == nil {
				mu.Lock()
				initialStats[cid] = s
				mu.Unlock()
			}
		}(id)
	}
	wg.Wait()

	// Wait for a delta
	time.Sleep(200 * time.Millisecond)

	// Fetch Final Stats
	finalStats := make(map[string]*containerStats)
	for _, id := range targets {
		wg.Add(1)
		go func(cid string) {
			defer wg.Done()
			s, err := fetchStats(apiClient, cid)
			if err == nil {
				mu.Lock()
				finalStats[cid] = s
				mu.Unlock()
			}
		}(id)
	}
	wg.Wait()

	var workerDetails []WorkerDetail
	for _, id := range targets {
		s1 := initialStats[id]
		s2 := finalStats[id]
		info := targetInfos[id]

		if s1 != nil && s2 != nil {
			// Calculate CPU Usage Percentage
			cpuUsage := 0.0
			cpuDelta := float64(s2.CPUStats.CPUUsage.TotalUsage) - float64(s1.CPUStats.CPUUsage.TotalUsage)
			systemDelta := float64(s2.CPUStats.SystemUsage) - float64(s1.CPUStats.SystemUsage)

			onlineCPUs := float64(s2.CPUStats.OnlineCPUs)
			if onlineCPUs == 0 {
				onlineCPUs = 1.0 // Fallback to at least 1 CPU to avoid zero results
			}

			if systemDelta > 0.0 && cpuDelta > 0.0 {
				cpuUsage = (cpuDelta / systemDelta) * onlineCPUs * 100.0
			}

			info.CPUUsage = cpuUsage
			info.MemoryUsage = s2.MemoryStats.Usage
			info.MemoryLimit = s2.MemoryStats.Limit
		}

		workerDetails = append(workerDetails, info)
	}

	return workerDetails, nil
}
