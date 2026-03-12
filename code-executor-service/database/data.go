package database

import (
	"context"
	"executor-service/utils"
)

// This file contains utility functions for interacting with the MongoDB database, specifically for fetching execution code data and updating execution code status
func (m *MongoDBClient) GetExecutionCodeData(id string) (*utils.ExecutionCode, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var codeData *utils.ExecutionCode
	err := m.ExecutionCode.FindOne(context.Background(), map[string]string{"_id": id}).Decode(&codeData)
	if err != nil {
		return nil, err
	}
	return codeData, nil
}

// GetProblemTestCases is a function that fetches the test cases for a given problem ID
func GetProblemTestCases(problemID string) (map[string]string, error) {
	var testCases map[string]string
	// Fetch test cases from ./.../problems/{problemID}/testcases.json
	// For the sake of this example, we'll return a hardcoded test case
	testCases = map[string]string{
		"1 2": "3",
		"4 5": "9",
		"6 7": "13",
		"8 9": "17",
	}
	return testCases, nil
}

// GetProblemConstraints is a function that fetches the constraints for a given problem ID, such as maximum execution time and memory limit
func GetProblemConstraints(problemID string) (int, int, error) {
	// Fetch constraints from ./.../problems/{problemID}/constraints.txt
	// For the sake of this example, we'll return hardcoded constraints
	maxTime := 1000  // in milliseconds
	maxMemory := 256 // in megabytes
	// Parse the constraints from the file and return the values
	return maxTime, maxMemory, nil
}

// UpdateExecutionCodeStatus is a function that updates the status of an execution code document in the MongoDB collection
// It takes the ID of the execution code document and the new status as parameters, and updates the document in the database accordingly
func (m *MongoDBClient) UpdateExecutionCodeStatus(id string, status utils.Result) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	_, err := m.ExecutionCode.UpdateOne(context.Background(), map[string]string{"_id": id}, map[string]interface{}{
		"$set": map[string]interface{}{
			"status": status,
		},
	})
	return err
}
