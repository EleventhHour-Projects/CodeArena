package database

import (
	"context"
	"executor-service/utils"
	"fmt"
	"log"
	"sync"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// MongoDBClient is a struct that holds the MongoDB client and collections
// It provides a convenient way to access the database and collections throughout the application
// The Client field is the MongoDB client that allows us to interact with the database
// The SubmissionsCollection field is a reference to the "submissions" collection in the "code-arena" database
// The UsersCollection field is a reference to the "users" collection in the "code-arena" database
type MongoDBClient struct {
	Client               *mongo.Client
	SumissionsCollection *mongo.Collection
	UsersCollection      *mongo.Collection
	ExecutionCode        *mongo.Collection
	// mu is a mutex to ensure thread-safe access to the MongoDB client and collections
	mu sync.RWMutex
}

// MongoDB is a global variable that holds the MongoDB client and collections
// It is initialized in the InitMongoDB function and can be accessed throughout the application
var MongoDB *MongoDBClient

// InitMongoDB initializes the MongoDB client and collections
func InitMongoDB() {
	client, err := mongo.Connect(options.Client().ApplyURI(utils.MONGO_URI))
	if err != nil {
		log.Fatal(utils.Red + "Failed to connect to MongoDB!" + utils.Reset)
	}
	err = client.Ping(context.Background(), nil)
	if err != nil {
		log.Fatal(utils.Red + "Failed to ping MongoDB!" + utils.Reset)
		return
	}
	fmt.Println(utils.Green + "Pinged your deployment. Successfully connected to MongoDB!" + utils.Reset)

	MongoDB = &MongoDBClient{
		Client:               client,
		SumissionsCollection: client.Database("code-arena").Collection("submissions"),
		UsersCollection:      client.Database("code-arena").Collection("users"),
		ExecutionCode:        client.Database("code-arena").Collection("executionCodes"),
		mu:                   sync.RWMutex{},
	}

	indexModel := mongo.IndexModel{
		Keys:    bson.D{bson.E{Key: "execCodeId", Value: 1}},
		Options: options.Index().SetUnique(true),
	}
	_, err = MongoDB.SumissionsCollection.Indexes().CreateOne(context.Background(), indexModel)
	if err != nil {
		log.Println(utils.Red + "Failed to create unique index for execCodeId:" + utils.Reset, err)
	}
}
