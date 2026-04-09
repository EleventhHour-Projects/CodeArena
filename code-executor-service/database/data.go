package database

import (
	"context"
	"encoding/json"
	"executor-service/utils"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

// This file contains utility functions for interacting with the MongoDB database, specifically for fetching execution code data and updating execution code status
func (m *MongoDBClient) GetExecutionCodeData(id string) (*utils.ExecutionCode, error) {
	id = strings.TrimSpace(id)

	// Debug: count documents in collection
	//count, _ := m.ExecutionCode.CountDocuments(context.Background(), bson.M{})
	//fmt.Println("Total docs in execution_code:", count)

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

// ProblemJSON or u can say testcases
type ProblemJSON struct {
	Testcases struct {
		Run []struct {
			Input  string `json:"input"`
			Output string `json:"output"`
		} `json:"run"`
		Submit []struct {
			Input  string `json:"input"`
			Output string `json:"output"`
		} `json:"submit"`
	} `json:"testcases"`
}

// GetProblemTestCases is a function that fetches the test cases for a given problem ID
func GetProblemTestCases(problemID int, all bool) (map[string]string, error) {
	// Let's assume the executable is run from the `code-executor-service` directory
	// so the `questions` directory is at `../questions/testcase`
	p := strconv.Itoa(problemID)
	questionsDir := filepath.Join("..", "questions/testcase")
	filePath := filepath.Join(questionsDir, p+".json")

	fileBytes, err := os.ReadFile(filePath)
	if err != nil {
		fmt.Printf("Error reading problem file: %s, %v\n", filePath, err)
		return nil, fmt.Errorf("could not read problem file for ID %s", p)
	}

	var problem ProblemJSON
	if err := json.Unmarshal(fileBytes, &problem); err != nil {
		fmt.Printf("Error unmarshalling problem JSON: %v\n", err)
		return nil, fmt.Errorf("invalid json in problem file for ID %s", p)
	}

	testCases := make(map[string]string)

	for _, tc := range problem.Testcases.Run {
		testCases[tc.Input] = tc.Output
	}

	if all {
		for _, tc := range problem.Testcases.Submit {
			testCases[tc.Input] = tc.Output
		}
	}

	return testCases, nil
}

// GetProblemConstraints is a function that fetches the constraints for a given problem ID, such as maximum execution time and memory limit
func GetProblemConstraints(problemID int) (int, int, error) {
	// Fetch constraints from ./.../problems/{problemID}/constraints.txt
	// For the sake of this example, we'll return hardcoded constraints
	maxTime := 1000  // in milliseconds
	maxMemory := 256 // in megabytes
	// Parse the constraints from the file and return the values
	return maxTime, maxMemory, nil
}

// UpdateExecutionCodeStatus is a function that updates the status of an submission document in the MongoDB collection
// It takes the ID of the execution code document and the new status as parameters, and updates the document in the database accordingly
func (m *MongoDBClient) UpdateExecutionCodeStatus(id string, status utils.Result, task utils.CodeConfig, pass bool) (*bson.ObjectID, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var passString string
	if pass {
		passString = "Accepted"
	} else {
		passString = "Rejected"
	}
	bsonObjId, _ := bson.ObjectIDFromHex(id)

	var subID *bson.ObjectID

	if task.Type == "Submit" {
		r, err := m.SumissionsCollection.InsertOne(context.Background(), utils.Submission{
			ExecutionCodeID: bsonObjId,
			Code:            task.Code,
			Language:        task.Language,
			Result:          &status,
			CreatedAt:       time.Now(),
			UserID:          task.UserID,
			BattleID:        task.BattleID,
			Problem:         task.Problem,
			Status:          &passString,
		})
		if err != nil {
			return nil, err
		}
		idVal, ok := r.InsertedID.(bson.ObjectID)
		if !ok {
			return nil, fmt.Errorf("failed to cast inserted ID")
		}
		subID = &idVal
	}

	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	filter := bson.M{"_id": objID}
	_, err = m.ExecutionCode.UpdateOne(context.TODO(), filter, bson.M{
		"$set": bson.M{
			"status": passString,
		},
	})
	if err != nil {
		return nil, err
	}

	return subID, nil
}

func (m *MongoDBClient) GetUser(userID string) (*utils.User, error) {
	objID, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, err
	}

	var user utils.User
	filter := bson.M{"_id": objID}
	err = m.UsersCollection.FindOne(context.Background(), filter).Decode(&user)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (m *MongoDBClient) GetUserByUsername(username string) (*utils.User, error) {
	var user utils.User
	filter := bson.M{"username": username}
	err := m.UsersCollection.FindOne(context.Background(), filter).Decode(&user)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (m *MongoDBClient) AssignBattleProblems(difficulty string) ([]utils.BattleProblem, error) {
	var easyCount, mediumCount, hardCount int
	diffLower := strings.ToLower(difficulty)

	switch diffLower {
	case "easy":
		easyCount = 2
		mediumCount = 1
	case "medium":
		mediumCount = 2
		hardCount = 1
	case "hard":
		mediumCount = 1
		hardCount = 2
	default:
		// Fallback to medium
		mediumCount = 2
		hardCount = 1
	}

	var problems []utils.BattleProblem

	eProbs, _ := m.fetchRandomProblems("easy", easyCount)
	mProbs, _ := m.fetchRandomProblems("medium", mediumCount)
	hProbs, _ := m.fetchRandomProblems("hard", hardCount)

	problems = append(problems, eProbs...)
	problems = append(problems, mProbs...)
	problems = append(problems, hProbs...)

	return problems, nil
}

func (m *MongoDBClient) fetchRandomProblems(level string, count int) ([]utils.BattleProblem, error) {
	if count == 0 {
		return []utils.BattleProblem{}, nil
	}

	questionsDir := filepath.Join("..", "questions", level)
	files, err := os.ReadDir(questionsDir)
	if err != nil {
		fmt.Printf("Error reading questions dir %s: %v\n", questionsDir, err)
		return []utils.BattleProblem{}, nil
	}

	var availableIDs []int
	for _, f := range files {
		if !f.Type().IsDir() && strings.HasSuffix(f.Name(), ".json") {
			idStr := strings.TrimSuffix(f.Name(), ".json")
			id, err := strconv.Atoi(idStr)
			if err == nil {
				availableIDs = append(availableIDs, id)
			}
		}
	}

	if len(availableIDs) < count {
		count = len(availableIDs)
	}

	// Shuffle
	for i := len(availableIDs) - 1; i > 0; i-- {
		j := utils.RandomInt(i + 1)
		availableIDs[i], availableIDs[j] = availableIDs[j], availableIDs[i]
	}

	var result []utils.BattleProblem
	for i := 0; i < count; i++ {
		result = append(result, utils.BattleProblem{
			Difficulty: level,
			ID:         availableIDs[i],
		})
	}

	return result, nil
}

func (m *MongoDBClient) CreateBattle(p1ID, p2ID bson.ObjectID, difficulty string) (bson.ObjectID, error) {
	problems, err := m.AssignBattleProblems(difficulty)
	if err != nil {
		return bson.NilObjectID, err
	}

	battle := utils.Battle{
		Player1:    p1ID,
		Player2:    p2ID,
		Status:     "Active",
		CreatedAt:  time.Now(),
		Difficulty: difficulty,
		Type:       "1v1",
		Problems:   problems,
		StartTime:  time.Now(),
	}

	res, err := m.BattlesCollection.InsertOne(context.Background(), battle)
	if err != nil {
		return bson.NilObjectID, err
	}

	battleID := res.InsertedID.(bson.ObjectID)

	// Update users
	_, _ = m.UsersCollection.UpdateOne(context.Background(), bson.M{"_id": p1ID}, bson.M{"$set": bson.M{"currentBattleId": battleID}})
	_, _ = m.UsersCollection.UpdateOne(context.Background(), bson.M{"_id": p2ID}, bson.M{"$set": bson.M{"currentBattleId": battleID}})

	return battleID, nil
}

func (m *MongoDBClient) ListFriends(userID string) ([]string, error) {
	objID, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, err
	}
	filter := bson.M{"user": objID}
	cursor, err := m.FriendCollection.Find(context.Background(), filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var friends []string
	for cursor.Next(context.Background()) {
		var friend utils.Friend
		if err := cursor.Decode(&friend); err != nil {
			log.Printf("Error decoding friend document: %v\n", err)
			return nil, err
		}
		friends = append(friends, friend.Friend.Hex())
	}

	if err := cursor.Err(); err != nil {
		log.Printf("Cursor error in ListFriends: %v\n", err)
		return nil, err
	}

	return friends, nil
}
