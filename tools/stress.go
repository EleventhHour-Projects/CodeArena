package main

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"sync/atomic"
	"syscall"
	"time"
)

type ExecPayload struct {
	Code       string `json:"code"`
	Language   string `json:"language"`
	UserID     string `json:"userId"`
	BattleID   string `json:"battleId"`
	Difficulty string `json:"difficulty"`
	ProblemID  int    `json:"problemId"`
	Type       string `json:"type"`
}

func getRandomCode() string {
	snippets := []string{
		"#include <iostream>\nint main() { std::cout << \"Output: \" << %d + %d << std::endl; return 0; }",
		"#include <vector>\n#include <numeric>\n#include <iostream>\nint main() { std::vector<int> v = {%d, %d}; std::cout << v[0] + v[1]; return 0; }",
		"#include <stdio.h>\nint main() { printf(\"Stress test run id %%d\", %d); return 0; }",
		"#include <cmath>\n#include <iostream>\nint main() { double x = sqrt(%d); std::cout << x; return 0; }",
	}
	idx := rand.Intn(len(snippets))
	return fmt.Sprintf(snippets[idx], rand.Intn(1000), rand.Intn(1000))
}

func main() {
	targetURL := flag.String("url", "https://codearena.pro/api/battle/exec-code", "Target API endpoint")
	reqPerMin := flag.Int("rate", 400, "Target request rate (requests per minute)")
	duration := flag.Duration("d", 5*time.Minute, "Test duration (e.g., 5m, 10m)")
	battleID := flag.String("battle-id", "6ac106815b434915c19c5447", "Battle ID")
	p1ID := flag.String("p1", "69de72c58961bbd5a5c37278", "Player 1 User ID")
	p2ID := flag.String("p2", "69be1dd7d348f17baed6c0a3", "Player 2 User ID")
	problemID := flag.Int("problem-id", 301, "Problem ID")
	difficulty := flag.String("difficulty", "medium", "Problem difficulty")
	concurrency := flag.Int("concurrency", 50, "Max concurrent in-flight requests")
	flag.Parse()

	if *reqPerMin <= 0 {
		log.Fatalf("Rate must be > 0")
	}

	players := []string{*p1ID, *p2ID}

	// Setup HTTP client with connection pooling
	transport := &http.Transport{
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 50,
		IdleConnTimeout:     90 * time.Second,
		TLSClientConfig:     &tls.Config{InsecureSkipVerify: false},
	}
	httpClient := &http.Client{
		Transport: transport,
		Timeout:   15 * time.Second,
	}

	// Concurrency semaphore
	sem := make(chan struct{}, *concurrency)

	var (
		totalSent   uint64
		http2xx     uint64
		http4xx     uint64
		http5xx     uint64
		netErrors   uint64
		totalLatNs  uint64
		minLatNs    uint64 = ^uint64(0)
		maxLatNs    uint64
		wg          sync.WaitGroup
	)

	interval := time.Duration(float64(time.Minute) / float64(*reqPerMin))

	fmt.Println("==================================================")
	fmt.Println("             CodeArena API Stress Test            ")
	fmt.Println("==================================================")
	fmt.Printf(" Target URL    : %s\n", *targetURL)
	fmt.Printf(" Target Rate   : %d req/min (~%.2f req/sec, interval: %v)\n", *reqPerMin, float64(*reqPerMin)/60.0, interval)
	fmt.Printf(" Duration      : %v\n", *duration)
	fmt.Printf(" Battle ID     : %s\n", *battleID)
	fmt.Printf(" Player 1 ID   : %s\n", *p1ID)
	fmt.Printf(" Player 2 ID   : %s\n", *p2ID)
	fmt.Printf(" Problem ID    : %d (%s)\n", *problemID, *difficulty)
	fmt.Printf(" Max In-Flight : %d concurrent\n", *concurrency)
	fmt.Println("==================================================")

	ctx, cancel := context.WithTimeout(context.Background(), *duration)
	defer cancel()

	// Handle graceful shutdown on Ctrl+C
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		fmt.Println("\nReceived interrupt signal. Stopping gracefully...")
		cancel()
	}()

	startTime := time.Now()
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// Live status logger
	go func() {
		statusTicker := time.NewTicker(5 * time.Second)
		defer statusTicker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-statusTicker.C:
				elapsed := time.Since(startTime).Seconds()
				sent := atomic.LoadUint64(&totalSent)
				s2xx := atomic.LoadUint64(&http2xx)
				s4xx := atomic.LoadUint64(&http4xx)
				s5xx := atomic.LoadUint64(&http5xx)
				nErr := atomic.LoadUint64(&netErrors)
				latNs := atomic.LoadUint64(&totalLatNs)

				actualRPM := float64(sent) / (elapsed / 60.0)
				var avgLatMs float64
				if (s2xx + s4xx + s5xx) > 0 {
					avgLatMs = float64(latNs) / float64(s2xx+s4xx+s5xx) / 1e6
				}

				fmt.Printf("[%5.1fs] Sent: %4d | 2xx: %4d | 4xx: %d | 5xx: %d | NetErr: %d | RPM: %5.1f | AvgLat: %.1fms\n",
					elapsed, sent, s2xx, s4xx, s5xx, nErr, actualRPM, avgLatMs)
			}
		}
	}()

	// Request generation loop
	for {
		select {
		case <-ctx.Done():
			goto Done
		case <-ticker.C:
			atomic.AddUint64(&totalSent, 1)
			wg.Add(1)

			// Acquire concurrency slot
			sem <- struct{}{}

			go func() {
				defer func() {
					<-sem
					wg.Done()
				}()

				// Randomize user and submission type
				user := players[rand.Intn(len(players))]
				subType := "Submit"
				if rand.Intn(2) == 0 {
					subType = "Run"
				}

				payload := ExecPayload{
					Code:       getRandomCode(),
					Language:   "cpp",
					UserID:     user,
					BattleID:   *battleID,
					Difficulty: *difficulty,
					ProblemID:  *problemID,
					Type:       subType,
				}

				bodyBytes, err := json.Marshal(payload)
				if err != nil {
					atomic.AddUint64(&netErrors, 1)
					return
				}

				req, err := http.NewRequestWithContext(ctx, http.MethodPost, *targetURL, bytes.NewReader(bodyBytes))
				if err != nil {
					atomic.AddUint64(&netErrors, 1)
					return
				}
				req.Header.Set("Content-Type", "application/json")

				t0 := time.Now()
				resp, err := httpClient.Do(req)
				lat := uint64(time.Since(t0).Nanoseconds())

				if err != nil {
					atomic.AddUint64(&netErrors, 1)
					return
				}
				defer resp.Body.Close()
				_, _ = io.Copy(io.Discard, resp.Body) // Drain body to allow connection reuse

				// Update latency
				atomic.AddUint64(&totalLatNs, lat)
				for {
					curMin := atomic.LoadUint64(&minLatNs)
					if lat >= curMin || atomic.CompareAndSwapUint64(&minLatNs, curMin, lat) {
						break
					}
				}
				for {
					curMax := atomic.LoadUint64(&maxLatNs)
					if lat <= curMax || atomic.CompareAndSwapUint64(&maxLatNs, curMax, lat) {
						break
					}
				}

				// Status breakdown
				switch {
				case resp.StatusCode >= 200 && resp.StatusCode < 300:
					atomic.AddUint64(&http2xx, 1)
				case resp.StatusCode >= 400 && resp.StatusCode < 500:
					if atomic.AddUint64(&http4xx, 1) <= 5 {
						log.Printf("HTTP 4xx Response: %s", resp.Status)
					}
				case resp.StatusCode >= 500:
					if atomic.AddUint64(&http5xx, 1) <= 5 {
						log.Printf("HTTP 5xx Response: %s", resp.Status)
					}
				}
			}()
		}
	}

Done:
	wg.Wait()
	totalElapsed := time.Since(startTime)
	finalSent := atomic.LoadUint64(&totalSent)
	final2xx := atomic.LoadUint64(&http2xx)
	final4xx := atomic.LoadUint64(&http4xx)
	final5xx := atomic.LoadUint64(&http5xx)
	finalNetErr := atomic.LoadUint64(&netErrors)
	finalLatNs := atomic.LoadUint64(&totalLatNs)
	minL := atomic.LoadUint64(&minLatNs)
	maxL := atomic.LoadUint64(&maxLatNs)

	var avgLatMs, minLatMs, maxLatMs float64
	totalResponded := final2xx + final4xx + final5xx
	if totalResponded > 0 {
		avgLatMs = float64(finalLatNs) / float64(totalResponded) / 1e6
		minLatMs = float64(minL) / 1e6
		maxLatMs = float64(maxL) / 1e6
	}

	fmt.Println("\n==================================================")
	fmt.Println("              Stress Test Summary                 ")
	fmt.Println("==================================================")
	fmt.Printf(" Total Duration : %v\n", totalElapsed.Truncate(time.Millisecond))
	fmt.Printf(" Requests Sent  : %d\n", finalSent)
	fmt.Printf(" Successful 2xx : %d\n", final2xx)
	fmt.Printf(" Client 4xx     : %d\n", final4xx)
	fmt.Printf(" Server 5xx     : %d\n", final5xx)
	fmt.Printf(" Network Errors : %d\n", finalNetErr)
	fmt.Printf(" Effective RPM  : %.2f req/min (%.2f req/sec)\n",
		float64(finalSent)/(totalElapsed.Seconds()/60.0),
		float64(finalSent)/totalElapsed.Seconds())
	if totalResponded > 0 {
		fmt.Printf(" Latency        : Min: %.1fms | Avg: %.1fms | Max: %.1fms\n", minLatMs, avgLatMs, maxLatMs)
	}
	fmt.Println("==================================================")
}
