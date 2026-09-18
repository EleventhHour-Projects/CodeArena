package database_test

import (
	"executor-service/database"
	"testing"
)

func TestGetProblemTestCases_Caching(t *testing.T) {
	// First fetch (loads from file into cache)
	tc1, err := database.GetProblemTestCases(1, false)
	if err != nil {
		t.Fatalf("unexpected error fetching problem 1: %v", err)
	}
	if len(tc1) == 0 {
		t.Fatal("expected at least 1 test case for problem 1 run mode")
	}

	// Second fetch (should load directly from in-memory cache)
	tc2, err := database.GetProblemTestCases(1, false)
	if err != nil {
		t.Fatalf("unexpected error on second fetch: %v", err)
	}

	if len(tc1) != len(tc2) {
		t.Fatalf("cached test case length mismatch: %d vs %d", len(tc1), len(tc2))
	}

	for k, v := range tc1 {
		if tc2[k] != v {
			t.Errorf("mismatch for input %q: expected %q, got %q", k, v, tc2[k])
		}
	}

	// Fetch with all=true (submit mode)
	tcAll, err := database.GetProblemTestCases(1, true)
	if err != nil {
		t.Fatalf("unexpected error on submit mode fetch: %v", err)
	}
	if len(tcAll) <= len(tc1) {
		t.Errorf("expected all testcases count (%d) to be greater than run testcases count (%d)", len(tcAll), len(tc1))
	}
}

func TestGetProblemConstraints(t *testing.T) {
	maxTime, maxMemory, err := database.GetProblemConstraints(1)
	if err != nil {
		t.Fatalf("unexpected error getting constraints: %v", err)
	}
	if maxTime <= 0 || maxMemory <= 0 {
		t.Errorf("invalid constraints: maxTime=%d, maxMemory=%d", maxTime, maxMemory)
	}
}
