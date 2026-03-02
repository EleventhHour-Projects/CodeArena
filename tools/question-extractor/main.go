package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/PuerkitoBio/goquery"
)

const (
	OUTPUT_DIR        = "../../questions"
	PROBLEM_JSON_FILE = "problems.json"
	STATEMENT_MD_FILE = "statements.md"
	LEETCODE          = "leetcode"
	CODEFORCES        = "codeforces"
)

type Problem struct {
	ID          int      `json:"id"`
	Slug        string   `json:"slug"`
	Title       string   `json:"title"`
	Difficulty  string   `json:"difficulty"`
	Tags        []string `json:"tags"`
	TimeLimit   int      `json:"time_limit"`
	MemoryLimit int      `json:"memory_limit"`
}

func main() {
	log.SetFlags(0)
	flag.Parse()

	for true {
		var link string
		log.Print("Enter the LeetCode/Codeforces problem link (or 'exit' to quit): ")
		_, err := fmt.Scanln(&link)
		if err != nil {
			log.Fatal(err)
		}
		if link == "exit" {
			break
		}
		processLink(link)
	}
}

func linkof(link string) string {
	if strings.Contains(link, "leetcode.com") {
		return LEETCODE
	} else if strings.Contains(link, "codeforces.com") {
		return CODEFORCES
	}
	return link
}

func processLink(link string) {
	switch linkof(link) {
	case LEETCODE:
		log.Printf("Processing LeetCode link: %s", link)
		LeetCodeLink(link)
	case CODEFORCES:
		log.Printf("Processing Codeforces link: %s", link)
		CodeforcesLink(link)
	default:
		log.Printf("Unknown platform for link: %s", link)
	}
}

func extractLeetCodeSlug(link string) string {
	parts := strings.Split(link, "/problems/")
	if len(parts) < 2 {
		return ""
	}
	return strings.Split(parts[1], "/")[0]
}

func nextID() int {
	entries, err := os.ReadDir(OUTPUT_DIR)
	if err != nil {
		return 1
	}
	count := 0
	for _, e := range entries {
		if e.IsDir() {
			count++
		}
	}
	return count + 1
}

func saveProblemJSON(p Problem) error {
	dir := fmt.Sprintf("%s/%s", OUTPUT_DIR, p.Slug)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(p, "", "\t")
	if err != nil {
		return err
	}
	return os.WriteFile(fmt.Sprintf("%s/%s", dir, PROBLEM_JSON_FILE), data, 0644)
}

func saveStatementMD(slug, content string) error {
	dir := fmt.Sprintf("%s/%s", OUTPUT_DIR, slug)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	return os.WriteFile(fmt.Sprintf("%s/%s", dir, STATEMENT_MD_FILE), []byte(content), 0644)
}

// ─── LeetCode ────────────────────────────────────────────────────────────────

type LeetCodeResponse struct {
	Data struct {
		Question struct {
			Title      string `json:"title"`
			Content    string `json:"content"`
			Difficulty string `json:"difficulty"`
		} `json:"question"`
	} `json:"data"`
}

func LeetCodeLink(link string) {
	slug := extractLeetCodeSlug(link)
	if slug == "" {
		log.Println("Invalid LeetCode link")
		return
	}

	query := `
	query getQuestionDetail($titleSlug: String!) {
		question(titleSlug: $titleSlug) {
			title
			content
			difficulty
		}
	}`

	body := fmt.Sprintf(`{
		"query": %q,
		"variables": {"titleSlug": "%s"}
	}`, query, slug)

	req, err := http.NewRequest("POST", "https://leetcode.com/graphql", strings.NewReader(body))
	if err != nil {
		log.Println(err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Mozilla/5.0")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Println(err)
		return
	}
	defer resp.Body.Close()

	var result LeetCodeResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		log.Println("Failed to parse response:", err)
		return
	}

	q := result.Data.Question
	if q.Title == "" {
		log.Println("Problem not found")
		return
	}

	p := Problem{
		ID:         nextID(),
		Slug:       slug,
		Title:      q.Title,
		Difficulty: q.Difficulty,
		Tags:       []string{},
	}

	content := fmt.Sprintf("# %s\n\n**Difficulty:** %s\n\n%s\n", q.Title, q.Difficulty, q.Content)

	if err := saveProblemJSON(p); err != nil {
		log.Println("Failed to save problem.json:", err)
		return
	}
	if err := saveStatementMD(slug, content); err != nil {
		log.Println("Failed to save statement.md:", err)
		return
	}
	log.Printf("Saved: %s/%s/\n", OUTPUT_DIR, slug)
}

// ─── Codeforces ───────────────────────────────────────────────────────────────

func CodeforcesLink(link string) {
	client := &http.Client{}
	req, err := http.NewRequest("GET", link, nil)
	if err != nil {
		log.Println("Failed to create request:", err)
		return
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")
	req.Header.Set("Connection", "keep-alive")

	resp, err := client.Do(req)
	if err != nil {
		log.Println("Failed to fetch URL:", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("Unexpected status: %s\n", resp.Status)
		return
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		log.Println("Failed to parse document:", err)
		return
	}

	problem := doc.Find("div.problem-statement")
	if problem.Length() == 0 {
		log.Println("Problem statement not found")
		return
	}

	// ── Meta ──────────────────────────────────────────────────────────────────
	title := strings.TrimSpace(problem.Find("div.title").First().Text())
	timeLimit := strings.TrimSpace(problem.Find("div.time-limit").First().Text())
	memoryLimit := strings.TrimSpace(problem.Find("div.memory-limit").First().Text())

	timeLimitNum, _ := strconv.Atoi(strings.Fields(
		strings.TrimPrefix(timeLimit, "time limit per test"))[0])
	memoryLimitNum, _ := strconv.Atoi(strings.Fields(
		strings.TrimPrefix(memoryLimit, "memory limit per test"))[0])

	// ── Sections ──────────────────────────────────────────────────────────────
	// Clone so removals don't affect later selectors
	bodySel := problem.Clone()
	bodySel.Find("div.header, div.input-specification, div.output-specification, div.sample-tests, div.note").Remove()
	bodyText := strings.TrimSpace(bodySel.Text())

	inputSpec := strings.TrimSpace(
		problem.Find("div.input-specification").Clone().
			Find("div.section-title").Remove().End().Text())

	outputSpec := strings.TrimSpace(
		problem.Find("div.output-specification").Clone().
			Find("div.section-title").Remove().End().Text())

	note := strings.TrimSpace(
		problem.Find("div.note").Clone().
			Find("div.section-title").Remove().End().Text())

	// ── Sample tests ──────────────────────────────────────────────────────────
	var samplesSB strings.Builder
	problem.Find("div.sample-tests").Find("div.test-example-line, pre").Each(func(i int, s *goquery.Selection) {
		// inputs and outputs are in <pre> blocks
	})

	// Simpler: grab input/output pre blocks in pairs
	inputs := problem.Find("div.input pre")
	outputs := problem.Find("div.output pre")
	for i := 0; i < inputs.Length(); i++ {
		inputText := strings.TrimSpace(inputs.Eq(i).Text())
		samplesSB.WriteString(fmt.Sprintf("**Input:**\n```\n%s\n```\n\n", inputText))
		if i < outputs.Length() {
			outputText := strings.TrimSpace(outputs.Eq(i).Text())
			samplesSB.WriteString(fmt.Sprintf("**Output:**\n```\n%s\n```\n\n", outputText))
		}
	}

	// ── Build markdown ────────────────────────────────────────────────────────
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("# %s\n\n", title))
	sb.WriteString(fmt.Sprintf("**Time Limit:** %s  \n", timeLimit))
	sb.WriteString(fmt.Sprintf("**Memory Limit:** %s\n\n", memoryLimit))
	sb.WriteString(fmt.Sprintf("**Source:** %s\n\n", link))
	sb.WriteString("---\n\n")
	sb.WriteString("## Problem Description\n\n")
	sb.WriteString(bodyText + "\n\n")

	if inputSpec != "" {
		sb.WriteString("## Input Format\n\n")
		sb.WriteString(inputSpec + "\n\n")
	}
	if outputSpec != "" {
		sb.WriteString("## Output Format\n\n")
		sb.WriteString(outputSpec + "\n\n")
	}
	if samplesSB.Len() > 0 {
		sb.WriteString("## Examples\n\n")
		sb.WriteString(samplesSB.String())
	}
	if note != "" {
		sb.WriteString("## Notes\n\n")
		sb.WriteString(note + "\n\n")
	}

	fmt.Print(sb.String())

	// ── Save ──────────────────────────────────────────────────────────────────
	slug := strings.ReplaceAll(strings.ToLower(title), " ", "-")

	p := Problem{
		ID:          nextID(),
		Slug:        slug,
		Title:       title,
		Difficulty:  "",
		Tags:        []string{},
		TimeLimit:   timeLimitNum,
		MemoryLimit: memoryLimitNum,
	}

	if err := saveProblemJSON(p); err != nil {
		log.Println("Failed to save problem.json:", err)
		return
	}
	if err := saveStatementMD(slug, sb.String()); err != nil {
		log.Println("Failed to save statement.md:", err)
		return
	}
	log.Printf("Saved: %s/%s/\n", OUTPUT_DIR, slug)
}
