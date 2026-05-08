package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"os"
	"sync"
	"sync/atomic"
	"time"

	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

type TestCase struct {
	Input  string `json:"input" bson:"input"`
	Output string `json:"output" bson:"output"`
}

type Problem struct {
	Difficulty string `json:"difficulty" bson:"difficulty"`
	ID         int    `json:"id" bson:"id"`
}

type ExecutionCode struct {
	ID        bson.ObjectID `bson:"_id"`
	Code      string        `bson:"code"`
	Type      string        `bson:"type"`
	Language  string        `bson:"language"`
	UserID    bson.ObjectID `bson:"userId"`
	Status    *string       `bson:"status,omitempty"`
	BattleID  bson.ObjectID `bson:"battleId"`
	Problem   Problem       `bson:"problem"`
	Testcases []TestCase    `bson:"testcases,omitempty"`
	CreatedAt time.Time     `bson:"createdAt,omitzero"`
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

func main() {
	// Load .env if present
	_ = godotenv.Load()

	numGoroutines := flag.Int("g", 1000, "Number of goroutines")
	duration := flag.Duration("d", 10*time.Minute, "Duration of the test")
	mongoURI := flag.String("mongo", getEnv("MONGODB", "mongodb://admin:password123@localhost:27017"), "MongoDB URI")
	redisAddr := flag.String("redis", getEnv("REDISURL", "localhost:6379"), "Redis address")
	redisPass := flag.String("redis-pass", getEnv("REDISPASS", "SecureRedisPwd_48c9052"), "Redis password")
	flag.Parse()

	rand.Seed(time.Now().UnixNano())

	// Initialize MongoDB
	opts := options.Client().
		ApplyURI(*mongoURI).
		SetMaxPoolSize(uint64(*numGoroutines))

	mongoClient, err := mongo.Connect(opts)
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	defer mongoClient.Disconnect(context.Background())

	if err := mongoClient.Ping(context.Background(), nil); err != nil {
		log.Fatalf("Failed to ping MongoDB: %v", err)
	}

	execCol := mongoClient.Database("code-arena").Collection("executionCodes")

	// Initialize Redis
	rdb := redis.NewClient(&redis.Options{
		Addr:     *redisAddr,
		Password: *redisPass,
	})
	defer rdb.Close()

	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}

	var (
		successCount uint64
		errorCount   uint64
		wg           sync.WaitGroup
	)

	fmt.Printf("Starting direct DB+Redis stress test with %d goroutines for %v...\n", *numGoroutines, *duration)

	startTime := time.Now()
	endTime := startTime.Add(*duration)

	for i := 0; i < *numGoroutines; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()

			ticker := time.NewTicker(1 * time.Second)
			defer ticker.Stop()

			for time.Now().Before(endTime) {
				select {
				case <-ticker.C:
					// Prepare dummy record
					execID := bson.NewObjectID()
					userID := bson.NewObjectID()
					battleID := bson.NewObjectID()

					problemID := 100 + rand.Intn(50)
					submissionType := "Run"
					if rand.Intn(2) == 0 {
						submissionType = "Submit"
					}

					testcases := []TestCase{}
					if submissionType == "Run" {
						testcases = []TestCase{{Input: "1 2", Output: "3"}}
					}

					status := "Pending"
					doc := ExecutionCode{
						ID:       execID,
						Code:     getRandomCode(),
						Type:     submissionType,
						Language: "cpp",
						UserID:   userID,
						Status:   &status,
						BattleID: battleID,
						Problem: Problem{
							Difficulty: "medium",
							ID:         problemID,
						},
						Testcases: testcases,
						CreatedAt: time.Now(),
					}

					// Use a timeout for operations
					opCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)

					// 1. Add record to DB
					_, err := execCol.InsertOne(opCtx, doc)
					if err != nil {
						if atomic.AddUint64(&errorCount, 1) <= 10 {
							log.Printf("MongoDB Error: %v", err)
						}
						cancel()
						continue
					}

					// 2. Send ID to Redis queue
					err = rdb.LPush(opCtx, "tasks", execID.Hex()).Err()
					if err != nil {
						if atomic.AddUint64(&errorCount, 1) <= 10 {
							log.Printf("Redis Error: %v", err)
						}
						cancel()
						continue
					}
					cancel()

					atomic.AddUint64(&successCount, 1)
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
