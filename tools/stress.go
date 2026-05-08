package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"sync"
	"sync/atomic"
	"time"
)

type TestCase struct {
	Input  string `json:"input"`
	Output string `json:"output"`
}

type SubmissionPayload struct {
	Code       string     `json:"code"`
	Language   string     `json:"language"`
	UserID     string     `json:"userId"`
	BattleID   string     `json:"battleId"`
	Difficulty string     `json:"difficulty"`
	ProblemID  int        `json:"problemId"`
	Type       string     `json:"type"`
	Testcases  []TestCase `json:"testcases,omitempty"`
}

func getRandomCode() string {
	snippets := []string{
		"#include <iostream>\nint main() { std::cout << \"Hello %d\" << std::endl; return 0; }",
		"#include <vector>\n#include <numeric>\nint main() { std::vector<int> v = {%d, %d}; return 0; }",
		"// Random comment %d\n#include <stdio.h>\nint main() { printf(\"Stress test\"); return 0; }",
		"#include <cmath>\nint main() { double x = sqrt(%d); return 0; }",
	}
	idx := rand.Intn(len(snippets))
	return fmt.Sprintf(snippets[idx], rand.Intn(1000), rand.Intn(1000))
}

func generateObjectID() string {
	chars := "0123456789abcdef"
	b := make([]byte, 24)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return string(b)
}

func main() {
	numGoroutines := flag.Int("g", 10000, "Number of goroutines")
	duration := flag.Duration("d", 10*time.Minute, "Duration of the test")
	targetURL := flag.String("url", "http://localhost:3000/api/battle/exec-code", "Target URL for submissions")
	flag.Parse()

	rand.Seed(time.Now().UnixNano())

	var (
		successCount uint64
		errorCount   uint64
		wg           sync.WaitGroup
	)

	fmt.Printf("Starting stress test with %d goroutines for %v...\n", *numGoroutines, *duration)
	fmt.Printf("Target URL: %s\n", *targetURL)

	startTime := time.Now()
	endTime := startTime.Add(*duration)

	// Configure client for high concurrency
	transport := &http.Transport{
		MaxIdleConns:        *numGoroutines,
		MaxIdleConnsPerHost: *numGoroutines,
		IdleConnTimeout:     90 * time.Second,
	}
	client := &http.Client{
		Transport: transport,
		Timeout:   10 * time.Second,
	}

	payloadTemplate := SubmissionPayload{
		Language:   "cpp",
		UserID:     generateObjectID(),
		BattleID:   generateObjectID(),
		Difficulty: "medium",
		ProblemID:  101,
		Type:       "Run",
	}

	for i := 0; i < *numGoroutines; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()

			// Ticker for 1 request per second
			ticker := time.NewTicker(1 * time.Second)
			defer ticker.Stop()

			for time.Now().Before(endTime) {
				select {
				case <-ticker.C:
					payload := payloadTemplate
					payload.Code = getRandomCode()
					payload.UserID = generateObjectID()
					payload.ProblemID = 100 + rand.Intn(50)
					if payload.Type == "Run" {
						payload.Testcases = []TestCase{{Input: "1 2", Output: "3"}}
					}
					jsonPayload, _ := json.Marshal(payload)

					resp, err := client.Post(*targetURL, "application/json", bytes.NewBuffer(jsonPayload))
					if err != nil {
						atomic.AddUint64(&errorCount, 1)
						continue
					}

					// Drain and close body to reuse connection
					io.Copy(io.Discard, resp.Body)
					resp.Body.Close()

					if resp.StatusCode >= 200 && resp.StatusCode < 300 {
						atomic.AddUint64(&successCount, 1)
					} else {
						atomic.AddUint64(&errorCount, 1)
					}
				}
			}
		}(i)
	}

	// Status reporter
	go func() {
		statusTicker := time.NewTicker(5 * time.Second)
		defer statusTicker.Stop()
		for time.Now().Before(endTime) {
			<-statusTicker.C
			s := atomic.LoadUint64(&successCount)
			e := atomic.LoadUint64(&errorCount)
			elapsed := time.Since(startTime).Seconds()
			rps := float64(s+e) / elapsed
			fmt.Printf("[%v] Success: %d, Errors: %d, Current RPS: %.2f\n",
				time.Since(startTime).Truncate(time.Second), s, e, rps)
		}
	}()

	wg.Wait()

	totalElapsed := time.Since(startTime)
	finalSuccess := atomic.LoadUint64(&successCount)
	finalError := atomic.LoadUint64(&errorCount)
	fmt.Println("\n--- Stress Test Finished ---")
	fmt.Printf("Total Duration: %v\n", totalElapsed)
	fmt.Printf("Total Success: %d\n", finalSuccess)
	fmt.Printf("Total Errors: %d\n", finalError)
	fmt.Printf("Average RPS: %.2f\n", float64(finalSuccess+finalError)/totalElapsed.Seconds())
}
