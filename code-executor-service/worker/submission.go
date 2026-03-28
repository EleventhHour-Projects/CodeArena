package worker

import (
	"executor-service/database"
	"executor-service/utils"
	"time"
)

// FailedInfo is a struct that holds information about whether a test case failed, the error message if it failed, and the test case number that caused the failure
// Internal Use Only: This struct is used internally within the worker package to track the results of test case executions and determine whether a submission passed or failed based on the test cases
type FailedInfo struct {
	isFailed     bool
	ErrorMessage string
	TestCase     string
	ActualOutput string
}

// SaveSubmissionResult is a function that saves the result of a code submission to the MongoDB database, including the execution time, memory used, and whether the submission passed or failed based on the test cases
// It takes the task configuration, execution time, memory used, and failed information as parameters, and updates the corresponding document in the database with the results
func SaveSubmissionResult(task *utils.CodeConfig, timeElapsed time.Duration, memory int, failed *FailedInfo) error {
	var status utils.Result
	isTle := false
	if int(timeElapsed.Seconds()) > task.Constraints.MaxTime {
		isTle = true
	}
	isMle := false
	if memory > task.Constraints.MaxMemory {
		isMle = true
	}
	status = utils.Result{
		TLE:                  isTle,
		MLE:                  isMle,
		FailedTestCaseNumber: &failed.TestCase,
		RunTimeMs:            int(timeElapsed.Milliseconds()),
		MemoryUsedMB:         memory,
		ErrorMSG:             failed.ErrorMessage,
		ActualOutput:         failed.ActualOutput,
	}
	event := utils.EVENTTYPESUBMITPASS
	if failed.isFailed {
		event = utils.EVENTTYPESUBMITFAIL
	} else if task.Type == "Run" {
		event = utils.EVENTTYPERUNPASS
		if isTle || isMle || failed.isFailed {
			event = utils.EVENTTYPERUNFAIL
		}
	}
	subID, _ := database.MongoDB.UpdateExecutionCodeStatus(task.TaskID, status, *task, !failed.isFailed)
	utils.WSServer.Add(utils.WSSPayload{
		UserID:       task.UserID,
		BattleID:     task.BattleID,
		SubmissionID: subID,
		ProblemID:    task.Problem.ID,
		Event:        utils.EVENTTYPE(event),
	})
	return nil
}
