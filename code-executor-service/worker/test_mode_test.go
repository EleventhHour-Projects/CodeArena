package worker_test

import (
	"encoding/json"
	"strings"
	"testing"

	"executor-service/database"
	"executor-service/utils"
)

func TestGetProblemTestCasesList_Modes(t *testing.T) {
	// Non-hidden (run) test cases
	nonHidden, err := database.GetProblemTestCasesList(1, "non_hidden")
	if err != nil {
		t.Fatalf("unexpected error fetching non_hidden: %v", err)
	}
	if len(nonHidden) == 0 {
		t.Fatal("expected at least 1 non-hidden test case for problem 1")
	}
	for _, tc := range nonHidden {
		if tc.IsHidden {
			t.Errorf("expected IsHidden=false for non-hidden test case, got true")
		}
	}

	// Hidden (submit) test cases
	hidden, err := database.GetProblemTestCasesList(1, "hidden")
	if err != nil {
		t.Fatalf("unexpected error fetching hidden: %v", err)
	}
	if len(hidden) == 0 {
		t.Fatal("expected at least 1 hidden test case for problem 1")
	}
	for _, tc := range hidden {
		if !tc.IsHidden {
			t.Errorf("expected IsHidden=true for hidden test case, got false")
		}
	}

	// All test cases
	all, err := database.GetProblemTestCasesList(1, "all")
	if err != nil {
		t.Fatalf("unexpected error fetching all: %v", err)
	}
	if len(all) != len(nonHidden)+len(hidden) {
		t.Fatalf("expected %d total test cases, got %d", len(nonHidden)+len(hidden), len(all))
	}

	// Verify first N are non-hidden, rest are hidden
	for i := 0; i < len(nonHidden); i++ {
		if all[i].IsHidden {
			t.Errorf("expected test case %d to be non-hidden in all mode", i)
		}
	}
	for i := len(nonHidden); i < len(all); i++ {
		if !all[i].IsHidden {
			t.Errorf("expected test case %d to be hidden in all mode", i)
		}
	}
}

type failedResultSnapshot struct {
	ActualOutput   string
	ExpectedOutput string
	TestCase       string
	IsHidden       bool
	ErrorMsg       string
}

func simulateResultMasking(task *utils.CodeConfig, failed failedResultSnapshot) utils.Result {
	actualOutput := failed.ActualOutput
	expectedOutput := failed.ExpectedOutput
	testCaseStr := failed.TestCase

	if failed.IsHidden {
		actualOutput = ""
		expectedOutput = ""
		testCaseStr = "[Hidden Test Case]"
	}

	return utils.Result{
		TLE:                  false,
		MLE:                  false,
		FailedTestCaseNumber: &testCaseStr,
		RunTimeMs:            50,
		MemoryUsedMB:         10,
		ErrorMSG:             failed.ErrorMsg,
		ActualOutput:         actualOutput,
		ExpectedOutput:       expectedOutput,
		IsHidden:             failed.IsHidden,
	}
}

func TestResultMasking_NonHiddenTestCase(t *testing.T) {
	task := &utils.CodeConfig{
		CodeType: "test",
		Type:     "NonHidden",
	}
	failed := failedResultSnapshot{
		ActualOutput:   "5",
		ExpectedOutput: "10",
		TestCase:       "2 3",
		IsHidden:       false,
		ErrorMsg:       "Wrong Answer",
	}

	res := simulateResultMasking(task, failed)
	if res.ActualOutput != "5" {
		t.Errorf("expected ActualOutput='5', got %q", res.ActualOutput)
	}
	if res.ExpectedOutput != "10" {
		t.Errorf("expected ExpectedOutput='10', got %q", res.ExpectedOutput)
	}
	if *res.FailedTestCaseNumber != "2 3" {
		t.Errorf("expected FailedTestCaseNumber='2 3', got %q", *res.FailedTestCaseNumber)
	}
	if res.IsHidden {
		t.Errorf("expected IsHidden=false")
	}
}

func TestResultMasking_HiddenTestCase(t *testing.T) {
	task := &utils.CodeConfig{
		CodeType: "test",
		Type:     "All",
	}
	failed := failedResultSnapshot{
		ActualOutput:   "secret_wrong_output",
		ExpectedOutput: "secret_expected_output",
		TestCase:       "100 200 500",
		IsHidden:       true,
		ErrorMsg:       "Wrong Answer",
	}

	res := simulateResultMasking(task, failed)
	if res.ActualOutput != "" {
		t.Errorf("expected ActualOutput to be masked/empty for hidden test case, got %q", res.ActualOutput)
	}
	if res.ExpectedOutput != "" {
		t.Errorf("expected ExpectedOutput to be masked/empty for hidden test case, got %q", res.ExpectedOutput)
	}
	if *res.FailedTestCaseNumber != "[Hidden Test Case]" {
		t.Errorf("expected FailedTestCaseNumber='[Hidden Test Case]', got %q", *res.FailedTestCaseNumber)
	}
	if !res.IsHidden {
		t.Errorf("expected IsHidden=true")
	}
	if res.ErrorMSG != "Wrong Answer" {
		t.Errorf("expected ErrorMSG='Wrong Answer', got %q", res.ErrorMSG)
	}
}

func TestResultMasking_CustomTestCase(t *testing.T) {
	task := &utils.CodeConfig{
		CodeType: "test",
		Type:     "Custom",
	}
	failed := failedResultSnapshot{
		ActualOutput:   "custom_actual",
		ExpectedOutput: "custom_expected",
		TestCase:       "my_custom_input",
		IsHidden:       false,
		ErrorMsg:       "Wrong Answer",
	}

	res := simulateResultMasking(task, failed)
	if res.ActualOutput != "custom_actual" {
		t.Errorf("expected ActualOutput='custom_actual', got %q", res.ActualOutput)
	}
	if res.ExpectedOutput != "custom_expected" {
		t.Errorf("expected ExpectedOutput='custom_expected', got %q", res.ExpectedOutput)
	}
	if *res.FailedTestCaseNumber != "my_custom_input" {
		t.Errorf("expected FailedTestCaseNumber='my_custom_input', got %q", *res.FailedTestCaseNumber)
	}
	if res.IsHidden {
		t.Errorf("expected IsHidden=false for custom test case")
	}
}

func TestJudgeScript_HiddenOutputFormat(t *testing.T) {
	// JSON schema verification for runnerResult with is_hidden
	rawJSON := `{"passed": false, "total_time_ms": 15, "error": "Wrong Answer", "testcase": "[Hidden Test Case]", "actual": "", "expected": "", "is_hidden": true}`
	type runnerResult struct {
		Passed      bool   `json:"passed"`
		TotalTimeMs int    `json:"total_time_ms"`
		Error       string `json:"error"`
		TestCase    string `json:"testcase"`
		Actual      string `json:"actual"`
		Expected    string `json:"expected"`
		IsHidden    bool   `json:"is_hidden"`
	}

	var res runnerResult
	if err := json.Unmarshal([]byte(rawJSON), &res); err != nil {
		t.Fatalf("failed to unmarshal runnerResult JSON: %v", err)
	}

	if !res.IsHidden {
		t.Errorf("expected IsHidden=true")
	}
	if res.Actual != "" || res.Expected != "" {
		t.Errorf("expected empty actual/expected on hidden failure")
	}
	if !strings.Contains(res.TestCase, "Hidden") {
		t.Errorf("expected testcase to indicate hidden, got %q", res.TestCase)
	}
}
