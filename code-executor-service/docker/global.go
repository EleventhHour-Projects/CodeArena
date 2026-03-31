package docker

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/moby/moby/client"
)

type WorkerDetail struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Image        string  `json:"image"`
	State        string  `json:"state"`
	Status       string  `json:"status"`
	CPUUsage     float64 `json:"cpu_usage"`     // Percentage
	OnlineCPUs   uint32  `json:"online_cpus"`   // Number of CPU cores
	MemoryUsage  uint64  `json:"memory_usage"`  // Bytes
	MemoryLimit  uint64  `json:"memory_limit"`  // Bytes
	CreatedAt    int64   `json:"created_at"`    // Unix timestamp
	StartedAt    string  `json:"started_at"`    // RFC3339
	RestartCount int     `json:"restart_count"` // How many times restarted
	Pid          int     `json:"pid"`           // Host PID of container init
	NetworkMode  string  `json:"network_mode"`  // e.g. "bridge"
	Ports        string  `json:"ports"`         // Comma-separated exposed ports
	NetworkRxMB  float64 `json:"network_rx_mb"` // MB received
	NetworkTxMB  float64 `json:"network_tx_mb"` // MB transmitted
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
	Networks map[string]struct {
		RxBytes uint64 `json:"rx_bytes"`
		TxBytes uint64 `json:"tx_bytes"`
	} `json:"networks"`
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

			// Collect exposed ports
			var portParts []string
			for _, p := range container.Ports {
				if p.PublicPort > 0 {
					portParts = append(portParts, fmt.Sprintf("%d->%d/%s", p.PublicPort, p.PrivatePort, p.Type))
				} else {
					portParts = append(portParts, fmt.Sprintf("%d/%s", p.PrivatePort, p.Type))
				}
			}
			ports := strings.Join(portParts, ", ")

			// Inspect for rich metadata
			startedAt := ""
			restartCount := 0
			pid := 0
			networkMode := ""
			result, inspectErr := apiClient.ContainerInspect(context.Background(), container.ID, client.ContainerInspectOptions{})
			if inspectErr == nil {
				c := result.Container
				if c.State != nil {
					startedAt = c.State.StartedAt
					pid = c.State.Pid
				}
				restartCount = c.RestartCount
				if c.HostConfig != nil {
					networkMode = string(c.HostConfig.NetworkMode)
				}
			}

			targets = append(targets, container.ID)
			targetInfos[container.ID] = WorkerDetail{
				ID:           container.ID,
				Name:         name,
				Image:        container.Image,
				State:        string(container.State),
				Status:       string(container.Status),
				CreatedAt:    container.Created,
				StartedAt:    startedAt,
				RestartCount: restartCount,
				Pid:          pid,
				NetworkMode:  networkMode,
				Ports:        ports,
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
			// CPU
			cpuUsage := 0.0
			cpuDelta := float64(s2.CPUStats.CPUUsage.TotalUsage) - float64(s1.CPUStats.CPUUsage.TotalUsage)
			systemDelta := float64(s2.CPUStats.SystemUsage) - float64(s1.CPUStats.SystemUsage)
			onlineCPUs := float64(s2.CPUStats.OnlineCPUs)
			if onlineCPUs == 0 {
				onlineCPUs = 1.0
			}
			if systemDelta > 0.0 && cpuDelta > 0.0 {
				cpuUsage = (cpuDelta / systemDelta) * onlineCPUs * 100.0
			}
			info.CPUUsage = cpuUsage
			info.OnlineCPUs = s2.CPUStats.OnlineCPUs
			info.MemoryUsage = s2.MemoryStats.Usage
			info.MemoryLimit = s2.MemoryStats.Limit

			// Network I/O — sum all interfaces from final snapshot
			var rxBytes, txBytes uint64
			for _, net := range s2.Networks {
				rxBytes += net.RxBytes
				txBytes += net.TxBytes
			}
			info.NetworkRxMB = float64(rxBytes) / (1024 * 1024)
			info.NetworkTxMB = float64(txBytes) / (1024 * 1024)
		}

		workerDetails = append(workerDetails, info)
	}

	return workerDetails, nil
}
