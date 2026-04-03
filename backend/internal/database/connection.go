package database

import (
	"context"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var DB *mongo.Database

func Connect() {
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://admin:password123@localhost:27017/servermgmt?authSource=admin"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal("Failed to connect to MongoDB:", err)
	}

	if err = client.Ping(ctx, nil); err != nil {
		log.Fatal("Failed to ping MongoDB:", err)
	}

	DB = client.Database("servermgmt")
	log.Println("Connected to MongoDB successfully")

	ensureIndexes(ctx)
}

// ensureIndexes creates all application indexes idempotently.
func ensureIndexes(ctx context.Context) {
	createAuditIndexes(ctx)
}

func createAuditIndexes(ctx context.Context) {
	col := DB.Collection("audit_logs")

	indexes := []mongo.IndexModel{
		// Primary sort: newest first
		{
			Keys:    bson.D{{Key: "timestamp", Value: -1}},
			Options: options.Index().SetName("timestamp_desc"),
		},
		// Filter by user
		{
			Keys:    bson.D{{Key: "user_id", Value: 1}},
			Options: options.Index().SetName("user_id"),
		},
		// Filter by username
		{
			Keys:    bson.D{{Key: "username", Value: 1}},
			Options: options.Index().SetName("username"),
		},
		// Filter by action
		{
			Keys:    bson.D{{Key: "action", Value: 1}},
			Options: options.Index().SetName("action"),
		},
		// Compound: user timeline queries
		{
			Keys:    bson.D{{Key: "user_id", Value: 1}, {Key: "timestamp", Value: -1}},
			Options: options.Index().SetName("user_id_timestamp"),
		},
		// Compound: action + time range queries
		{
			Keys:    bson.D{{Key: "action", Value: 1}, {Key: "timestamp", Value: -1}},
			Options: options.Index().SetName("action_timestamp"),
		},
	}

	if _, err := col.Indexes().CreateMany(ctx, indexes); err != nil {
		log.Printf("Warning: failed to create audit_logs indexes: %v", err)
		return
	}
	log.Println("audit_logs indexes ensured")
}
