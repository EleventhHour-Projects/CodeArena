package battle

import (
	"sync"
)

type TimeRange struct {
	Min int `json:"min"`
	Max int `json:"max"`
}

type SolveDiffConfig struct {
	P1Chance int       `json:"p1_chance"` // threshold for range 1
	P2Chance int       `json:"p2_chance"` // threshold for range 2
	Range1   TimeRange `json:"range_1"`
	Range2   TimeRange `json:"range_2"`
	Range3   TimeRange `json:"range_3"`
}

type BehaviorConfig struct {
	SolveTimes struct {
		Easy   SolveDiffConfig `json:"easy"`
		Medium SolveDiffConfig `json:"medium"`
		Hard   SolveDiffConfig `json:"hard"`
	} `json:"solve_times"`

	WrongExecs struct {
		MinCount int `json:"min_count"`
		MaxCount int `json:"max_count"`
	} `json:"wrong_execs"`

	DrawAcceptance struct {
		FirstRequestChance int `json:"first_request_chance"`
		RepeatRequestChance int `json:"repeat_request_chance"`
	} `json:"draw_acceptance"`

	Surrender struct {
		Chance       int `json:"chance"`
		DelayMinutes int `json:"delay_minutes"`
	} `json:"surrender"`

	BaseDurations struct {
		Easy   int `json:"easy_minutes"`
		Medium int `json:"medium_minutes"`
		Hard   int `json:"hard_minutes"`
	} `json:"base_durations"`
}

var (
	CurrentConfig BehaviorConfig
	ConfigMu      sync.RWMutex
)

func init() {
	// Set default values based on current hardcoded logic
	CurrentConfig = BehaviorConfig{}
	
	// Easy
	CurrentConfig.SolveTimes.Easy.P1Chance = 79
	CurrentConfig.SolveTimes.Easy.P2Chance = 91
	CurrentConfig.SolveTimes.Easy.Range1 = TimeRange{2, 7}
	CurrentConfig.SolveTimes.Easy.Range2 = TimeRange{8, 12}
	CurrentConfig.SolveTimes.Easy.Range3 = TimeRange{13, 17}

	// Medium
	CurrentConfig.SolveTimes.Medium.P1Chance = 62
	CurrentConfig.SolveTimes.Medium.P2Chance = 78
	CurrentConfig.SolveTimes.Medium.Range1 = TimeRange{8, 13}
	CurrentConfig.SolveTimes.Medium.Range2 = TimeRange{15, 20}
	CurrentConfig.SolveTimes.Medium.Range3 = TimeRange{21, 25}

	// Hard
	CurrentConfig.SolveTimes.Hard.P1Chance = 58
	CurrentConfig.SolveTimes.Hard.P2Chance = 79
	CurrentConfig.SolveTimes.Hard.Range1 = TimeRange{15, 20}
	CurrentConfig.SolveTimes.Hard.Range2 = TimeRange{20, 30}
	CurrentConfig.SolveTimes.Hard.Range3 = TimeRange{30, 40}

	// Wrong Execs
	CurrentConfig.WrongExecs.MinCount = 4
	CurrentConfig.WrongExecs.MaxCount = 10

	// Draw Acceptance
	CurrentConfig.DrawAcceptance.FirstRequestChance = 32
	CurrentConfig.DrawAcceptance.RepeatRequestChance = 69

	// Surrender
	CurrentConfig.Surrender.Chance = 25
	CurrentConfig.Surrender.DelayMinutes = 30

	// Base Durations
	CurrentConfig.BaseDurations.Easy = 10
	CurrentConfig.BaseDurations.Medium = 15
	CurrentConfig.BaseDurations.Hard = 35
}
