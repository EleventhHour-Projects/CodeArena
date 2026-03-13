package database

import (
	"context"
	"executor-service/utils"
	"fmt"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

// This file contains utility functions for interacting with the MongoDB database, specifically for fetching execution code data and updating execution code status
func (m *MongoDBClient) GetExecutionCodeData(id string) (*utils.ExecutionCode, error) {
	id = strings.TrimSpace(id)

	// 1. Validate the ID
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, fmt.Errorf("conversion failed for id %s: %v", id, err)
	}

	var codeData utils.ExecutionCode
	ctx, cancel := context.WithTimeout(context.TODO(), 5*time.Second)
	defer cancel()
	cur, err := m.ExecutionCode.Find(ctx, bson.D{}, nil)
	for cur.Next(ctx) {
		if err := cur.Decode(&codeData); err != nil {
			return nil, err
		}
		if codeData.ID == objID {
			break
		}
	}
	err = cur.Err()

	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("no document found with _id: %s", id)
		}
		return nil, err
	}

	return &codeData, nil
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
	_, err := m.SumissionsCollection.InsertOne(context.Background(), utils.Submission{
		Code:      task.Code,
		Language:  task.Language,
		Result:    &status,
		CreatedAt: time.Now(),
		UserID:    task.UserID,
		BattleID:  task.BattleID,
		ProblemID: task.ProblemID,
		Status:    &passString,
	})
	if err != nil {
		return err
	}
	_, err = m.ExecutionCode.UpdateOne(context.TODO(), bson.M{"_id": task.TaskID}, bson.M{
		"$set": bson.M{
			"status": passString,
		},
	})
	return err
}
