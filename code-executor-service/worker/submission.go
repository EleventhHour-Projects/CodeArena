package worker

import (
	"executor-service/database"
	"executor-service/utils"
	"strings"
	"time"
)

// FailedInfo is a struct that holds information about whether a test case failed, the error message if it failed, and the test case number that caused the failure
// Internal Use Only: This struct is used internally within the worker package to track the results of test case executions and determine whether a submission passed or failed based on the test cases
type FailedInfo struct {
	isFailed       bool
	ErrorMessage   string
	TestCase       string
	ActualOutput   string
	ExpectedOutput string
	IsHidden       bool
	PassedCount    int
	TotalCount     int
}

// SaveSubmissionResult is a function that saves the result of a code submission to the MongoDB database, including the execution time, memory used, and whether the submission passed or failed based on the test cases
// It takes the task configuration, execution time, memory used, and failed information as parameters, and updates the corresponding document in the database with the results
func SaveSubmissionResult(task *utils.CodeConfig, timeElapsed time.Duration, memory int, failed *FailedInfo) error {
	var status utils.Result
	isTle := false
	if task.Constraints != nil && task.Constraints.MaxTime > 0 && int(timeElapsed.Seconds()) > task.Constraints.MaxTime {
		isTle = true
	}
	isMle := false
	if task.Constraints != nil && task.Constraints.MaxMemory > 0 && memory > task.Constraints.MaxMemory {
		isMle = true
	}

	actualOutput := failed.ActualOutput
	expectedOutput := failed.ExpectedOutput
	testCaseStr := failed.TestCase

	// If failed on a hidden testcase, mask outputs and input from user
	if failed.IsHidden {
		actualOutput = ""
		expectedOutput = ""
		if failed.isFailed {
			testCaseStr = "[Hidden Test Case]"
		}
	}

	status = utils.Result{
		TLE:                  isTle,
		MLE:                  isMle,
		FailedTestCaseNumber: &testCaseStr,
		RunTimeMs:            int(timeElapsed.Milliseconds()),
		MemoryUsedMB:         memory,
		ErrorMSG:             failed.ErrorMessage,
		ActualOutput:         actualOutput,
		ExpectedOutput:       expectedOutput,
		IsHidden:             failed.IsHidden,
		PassedCount:          failed.PassedCount,
		TotalCount:           failed.TotalCount,
	}

	event := utils.EVENTTYPESUBMITPASS
	isRunType := strings.EqualFold(task.Type, "Run") || strings.EqualFold(task.Type, "Custom") || strings.EqualFold(task.Type, "NonHidden")
	if failed.isFailed {
		if isRunType {
			event = utils.EVENTTYPERUNFAIL
		} else {
			event = utils.EVENTTYPESUBMITFAIL
		}
	} else if isRunType {
		event = utils.EVENTTYPERUNPASS
		if isTle || isMle {
			event = utils.EVENTTYPERUNFAIL
		}
	}

	subID, _ := database.MongoDB.UpdateExecutionCodeStatus(task.TaskID, status, *task, !failed.isFailed)
	if !task.BattleID.IsZero() {
		utils.WSServer.Add(utils.WSSPayload{
			UserID:       task.UserID,
			BattleID:     task.BattleID,
			SubmissionID: subID,
			ProblemID:    task.Problem.ID,
			Event:        utils.EVENTTYPE(event),
		})
	}
	return nil
}
