package database

import (
	"context"
	"encoding/json"
	"executor-service/utils"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/v2/bson"
)

// This file contains utility functions for interacting with the MongoDB database, specifically for fetching execution code data and updating execution code status
func (m *MongoDBClient) GetExecutionCodeData(id string) (*utils.ExecutionCode, error) {
	id = strings.TrimSpace(id)

	// Debug: count documents in collection
	count, _ := m.ExecutionCode.CountDocuments(context.Background(), bson.M{})
	fmt.Println("Total docs in execution_code:", count)

	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var codeData utils.ExecutionCode
	filter := bson.M{"_id": objID}
	err = m.ExecutionCode.FindOne(context.Background(), filter).Decode(&codeData)
	if err != nil {
		return nil, err
	}

	return &codeData, nil
}

type ProblemJSON struct {
	Testcases []struct {
		Input  string `json:"input"`
		Output string `json:"output"`
	} `json:"testcases"`
}

// GetProblemTestCases is a function that fetches the test cases for a given problem ID
func GetProblemTestCases(problemID string) (map[string]string, error) {
	// Let's assume the executable is run from the `code-executor-service` directory
	// so the `questions` directory is at `../questions`
	questionsDir := filepath.Join("..", "questions")
	filePath := filepath.Join(questionsDir, problemID+".json")

	fileBytes, err := os.ReadFile(filePath)
	if err != nil {
		fmt.Printf("Error reading problem file: %s, %v\n", filePath, err)
		return nil, fmt.Errorf("could not read problem file for ID %s", problemID)
	}

	var problem ProblemJSON
	if err := json.Unmarshal(fileBytes, &problem); err != nil {
		fmt.Printf("Error unmarshalling problem JSON: %v\n", err)
		return nil, fmt.Errorf("invalid json in problem file for ID %s", problemID)
	}

	testCases := make(map[string]string)
	for _, tc := range problem.Testcases {
		testCases[tc.Input] = tc.Output
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

// UpdateExecutionCodeStatus is a function that updates the status of an submission document in the MongoDB collection
// It takes the ID of the execution code document and the new status as parameters, and updates the document in the database accordingly
func (m *MongoDBClient) UpdateExecutionCodeStatus(id string, status utils.Result, task utils.CodeConfig, pass bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	var passString string
	if pass {
		passString = "Accepted"
	} else {
		passString = "Rejected"
	}
	objId, _ := primitive.ObjectIDFromHex(id)
	//fmt.Println(objId)
	_, err := m.SumissionsCollection.InsertOne(context.Background(), utils.Submission{
		ExecutionCodeID: objId.String(),
		Code:            task.Code,
		Language:        task.Language,
		Result:          &status,
		CreatedAt:       time.Now(),
		UserID:          task.UserID,
		BattleID:        task.BattleID,
		ProblemID:       task.ProblemID,
		Status:          &passString,
	})
	if err != nil {
		return err
	}
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	filter := bson.M{"_id": objID}
	_, err = m.ExecutionCode.UpdateOne(context.TODO(), filter, bson.M{
		"$set": bson.M{
			"status": passString,
		},
	})
	return err
}
