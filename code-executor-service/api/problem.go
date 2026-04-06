package api

import (
	"context"
	"encoding/json"
	"executor-service/gh"
	"executor-service/utils"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/nottechdm/notnet/pkg/notnet"
)

// ProblemPayload represents the structure of the payload received when creating a new problem,
// containing fields such as slug, tags, title, difficulty, description, and testcases,
// which are essential for defining the details of the problem to be added to the system.
type ProblemPayload struct {
	Slug        string      `json:"slug"`
	Tags        []string    `json:"tags"`
	Title       string      `json:"title"`
	Difficulty  string      `json:"difficulty"`
	Description string      `json:"description"`
	Testcases   interface{} `json:"testcases"`
}

// QuestionJson represents the structure of the question details that will be saved in a JSON file,
// containing fields such as ID, slug, tags, title, difficulty, description, input format, output format, and constraints,
// which are essential for defining the problem statement and its associated metadata for use in the code execution service.
type QuestionJson struct {
	ID           int      `json:"id"`
	Slug         string   `json:"slug"`
	Tags         []string `json:"tags"`
	Title        string   `json:"title"`
	Difficulty   string   `json:"difficulty"`
	Description  string   `json:"description"`
	InputFormat  string   `json:"input_format"`
	OutputFormat string   `json:"output_format"`
	Constraints  string   `json:"constraints"`
	Verified     bool     `json:"verified"`
}

// getNextId calculates the next available ID for a new problem based on the specified difficulty level,
// by retrieving the current count of questions with the same difficulty from GitHub and considering any pending pull requests,
// ensuring that the new problem is assigned a unique ID within the defined range for its difficulty level (easy: 1-299, medium: 300-599, hard: 600-899).
func getNextId(difficulty string) (int, error) {
	d := strings.ToLower(difficulty)

	var minId, maxId int
	switch d {
	case "easy":
		minId, maxId = 1, 299
	case "medium":
		minId, maxId = 300, 599
	case "hard":
		minId, maxId = 600, 899
	default:
		return 0, fmt.Errorf("invalid difficulty: %s", difficulty)
	}

	ctx := context.Background()
	count, err := gh.GetNumberOfQuestionByLabel(ctx, d)
	if err != nil {
		return 0, err
	}
	prs, err := gh.GetAllPRs(ctx, &d)
	if err != nil {
		return 0, err
	}
	pendingPRs := len(prs)

	nextID := minId + count + pendingPRs
	if nextID > maxId {
		return 0, fmt.Errorf("ID limit exceeded for %s (max %d)", d, maxId)
	}
	return nextID, nil
}

// SaveProblem is a handler function that creates a new problem
func SaveProblem(req *notnet.Request, res *notnet.Response) error {
	var payload ProblemPayload
	err := req.BindJSON(&payload)
	if err != nil {
		return res.String(400, "Invalid request body")
	}

	difficulty := payload.Difficulty
	if difficulty == "" {
		return res.String(400, "Difficulty is required")
	}

	nextId, err := getNextId(difficulty)
	if err != nil {
		return res.String(500, "Failed to get next ID")
	}

	questionJson := QuestionJson{
		ID:           nextId,
		Slug:         payload.Slug,
		Tags:         payload.Tags,
		Title:        payload.Title,
		Difficulty:   difficulty,
		Description:  payload.Description,
		InputFormat:  "Read from standard input. Format details depends on the problem.",
		OutputFormat: "Print to standard output.",
		Constraints:  "Please read problem description for constraints.",
		Verified:     false,
	}

	questionsDir := filepath.Join("..", "questions")
	questionDir := filepath.Join(questionsDir, strings.ToLower(difficulty))
	testcaseDir := filepath.Join(questionsDir, "testcase")

	if err := os.MkdirAll(testcaseDir, 0755); err != nil {
		return res.String(500, "Failed to create testcase directory")
	}
	if err := os.MkdirAll(questionDir, 0755); err != nil {
		return res.String(500, "Failed to create difficulty directory")
	}

	questionBytes, err := json.MarshalIndent(questionJson, "", "    ")
	if err != nil {
		return res.String(500, "Failed to marshal question details")
	}

	testcasesWrapper := map[string]interface{}{
		"testcases": payload.Testcases,
	}

	testcasesBytes, err := json.MarshalIndent(testcasesWrapper, "", "    ")
	if err != nil {
		return res.String(500, "Failed to marshal testcases")
	}

	// Push directly to GitHub (NO LOCAL SAVE)
	err = PushToGithub(questionBytes, testcasesBytes, difficulty, nextId, payload.Title)
	if err != nil {
		return res.String(500, "Failed to push to GitHub: "+err.Error())
	}

	return res.JSON(200, map[string]interface{}{
		"message": fmt.Sprintf("Successfully generated question! ID: %d", nextId),
		"id":      nextId,
		"slug":    payload.Slug,
	})
}

// PushToGithub pushes the question and testcases to GitHub by creating a new pull request with the provided details,
// allowing for seamless integration of new problems into the GitHub repository, where the function constructs the necessary files and metadata for the problem and utilizes the GitHub client to create a pull request with the appropriate branch name, title, body, and file contents, ensuring that the new problem is added to the repository in an organized and efficient manner.
func PushToGithub(questionBytes, testcaseBytes []byte, difficulty string, id int, title string) error {
	if utils.GhClient == nil {
		return fmt.Errorf("github client not initialized")
	}

	branchName := fmt.Sprintf("add-problem-%d-%d", id, os.Getpid())
	prTitle := fmt.Sprintf("Add Problem: %s", title)
	prBody := fmt.Sprintf("Auto-generated problem ID %d: %s", id, title)

	files := map[string][]byte{
		fmt.Sprintf("questions/%s/%d.json", strings.ToLower(difficulty), id): questionBytes,
		fmt.Sprintf("questions/testcase/%d.json", id):                        testcaseBytes,
	}

	_, err := gh.CreatePR(
		utils.GhClient,
		context.Background(),
		branchName,
		prTitle,
		prBody,
		files,
		difficulty,
	)

	return err
}
