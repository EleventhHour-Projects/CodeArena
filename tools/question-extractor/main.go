package main

import (
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
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
	slug := strings.Split(parts[1], "/")[0]
	return slug
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

	io.Copy(os.Stdout, resp.Body)
}

func CodeforcesLink(link string) {
	resp, err := http.Get(link)
	defer resp.Body.Close()
	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		log.Println(err)
		return
	}

	problem := doc.Find("div.problem-statement")
	if problem.Length() == 0 {
		log.Println("Problem statement not found")
		return
	}

	title := strings.TrimSpace(problem.Find("div.title").First().Text())
	timeLimit := strings.TrimSpace(problem.Find("div.time-limit").First().Text())
	memoryLimit := strings.TrimSpace(problem.Find("div.memory-limit").First().Text())

	fmt.Println("Title:", title)
	fmt.Println("Time:", timeLimit)
	fmt.Println("Memory:", memoryLimit)
	fmt.Println()
	problem.Children().Each(func(i int, s *goquery.Selection) {
		class, _ := s.Attr("class")

		if class == "header" {
			return
		}

		text := strings.TrimSpace(s.Text())
		if text != "" {
			fmt.Println(text)
			fmt.Println()
		}
	})
}
