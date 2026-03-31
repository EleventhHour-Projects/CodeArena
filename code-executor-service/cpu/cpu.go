package cpu

import (
	"fmt"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
)

// GetCPUUsage retrieves the current CPU usage percentage,
// allowing for monitoring of the system's CPU performance and resource utilization in the code execution service,
// which can be useful for optimizing performance and ensuring efficient use of resources during code execution tasks.
func GetCPUUsage() (string, error) {
	percent, err := cpu.Percent(0, false)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%.2f%%", percent[0]), nil
}

// GetCPUPercent returns the raw CPU percentage as float64.
func GetCPUPercent() (float64, error) {
	percent, err := cpu.Percent(0, false)
	if err != nil {
		return 0, err
	}
	return percent[0], nil
}

// GetMemoryUsage retrieves the current memory usage percentage,
// allowing for monitoring of the system's memory performance and resource utilization in the code execution service,
// which can be useful for optimizing performance and ensuring efficient use of resources during code execution tasks.
func GetMemoryUsage() (string, error) {
	v, err := mem.VirtualMemory()
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%.2f%%", v.UsedPercent), nil
}

// GetMemoryPercent returns the raw Memory percentage as float64.
func GetMemoryPercent() (float64, error) {
	v, err := mem.VirtualMemory()
	if err != nil {
		return 0, err
	}
	return v.UsedPercent, nil
}
