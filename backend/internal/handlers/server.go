package handlers

import (
	"context"
	"net/http"
	"time"

	"server-management/internal/database"
	"server-management/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func CreateServer(c *gin.Context) {
	var server models.Server
	if err := c.ShouldBindJSON(&server); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	server.CreatedAt = time.Now()
	server.UpdatedAt = time.Now()

	collection := database.DB.Collection("servers")
	result, err := collection.InsertOne(context.Background(), server)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create server"})
		return
	}

	server.ID = result.InsertedID.(primitive.ObjectID)
	c.JSON(http.StatusCreated, server)
}

func GetServers(c *gin.Context) {
	collection := database.DB.Collection("servers")
	
	// Get query parameters for pagination
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "10")
	
	// Convert to int64
	pageInt := int64(1)
	limitInt := int64(10)
	
	// Calculate skip
	skip := (pageInt - 1) * limitInt
	
	// Find options
	findOptions := options.Find()
	findOptions.SetLimit(limitInt)
	findOptions.SetSkip(skip)
	findOptions.SetSort(bson.D{{"created_at", -1}})

	cursor, err := collection.Find(context.Background(), bson.M{}, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch servers"})
		return
	}
	defer cursor.Close(context.Background())

	var servers []models.Server
	if err = cursor.All(context.Background(), &servers); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode servers"})
		return
	}

	// Get total count
	total, err := collection.CountDocuments(context.Background(), bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count servers"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"servers": servers,
		"total":   total,
		"page":    pageInt,
		"limit":   limitInt,
	})
}

func GetServer(c *gin.Context) {
	id := c.Param("id")
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	collection := database.DB.Collection("servers")
	var server models.Server
	err = collection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&server)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	c.JSON(http.StatusOK, server)
}

func UpdateServer(c *gin.Context) {
	id := c.Param("id")
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	var server models.Server
	if err := c.ShouldBindJSON(&server); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	server.UpdatedAt = time.Now()

	collection := database.DB.Collection("servers")
	update := bson.M{"$set": server}
	
	result, err := collection.UpdateOne(context.Background(), bson.M{"_id": objectID}, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update server"})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	server.ID = objectID
	c.JSON(http.StatusOK, server)
}

func DeleteServer(c *gin.Context) {
	id := c.Param("id")
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	collection := database.DB.Collection("servers")
	result, err := collection.DeleteOne(context.Background(), bson.M{"_id": objectID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete server"})
		return
	}

	if result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Server deleted successfully"})
}