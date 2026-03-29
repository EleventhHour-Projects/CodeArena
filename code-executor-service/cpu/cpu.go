package cpu

import (
	"fmt"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
)

func GetCPUUsage() (string, error) {
	percent, err := cpu.Percent(0, false)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%.2f%%", percent[0]), nil
}

func GetMemoryUsage() (string, error) {
	v, err := mem.VirtualMemory()
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%.2f%%", v.UsedPercent), nil
}
