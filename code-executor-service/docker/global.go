package docker

import (
	"context"
	"encoding/json"
	"fmt"

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

	var workerDetails []WorkerDetail

	for _, container := range containers.Items {
		if container.Image == "gcc:13" {
			// Fetch stats for each container
			statsResp, err := apiClient.ContainerStats(context.Background(), container.ID, client.ContainerStatsOptions{Stream: false})
			if err != nil {
				fmt.Printf("Error fetching stats for container %s: %v\n", container.ID, err)
				continue
			}

			// Define a local struct for decoding stats to avoid library dependency issues
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

			var stats containerStats
			decoder := json.NewDecoder(statsResp.Body)
			if err := decoder.Decode(&stats); err != nil {
				statsResp.Body.Close()
				fmt.Printf("Error decoding stats for container %s: %v\n", container.ID, err)
				continue
			}
			statsResp.Body.Close()

			// Calculate CPU Usage Percentage
			cpuUsage := 0.0
			cpuDelta := float64(stats.CPUStats.CPUUsage.TotalUsage) - float64(stats.PreCPUStats.CPUUsage.TotalUsage)
			systemDelta := float64(stats.CPUStats.SystemUsage) - float64(stats.PreCPUStats.SystemUsage)

			if systemDelta > 0.0 && cpuDelta > 0.0 {
				cpuUsage = (cpuDelta / systemDelta) * float64(stats.CPUStats.OnlineCPUs) * 100.0
			}

			name := ""
			if len(container.Names) > 0 {
				name = container.Names[0]
			}

			workerDetails = append(workerDetails, WorkerDetail{
				ID:          container.ID,
				Name:        name,
				Image:       container.Image,
				State:       string(container.State),
				Status:      string(container.Status),
				CPUUsage:    cpuUsage,
				MemoryUsage: stats.MemoryStats.Usage,
				MemoryLimit: stats.MemoryStats.Limit,
			})
		}
	}

	return workerDetails, nil
}
