package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"server-management/internal/audit"
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

	audit.Log(audit.Entry{
		UserID:     c.GetString("user_id"),
		Username:   c.GetString("username"),
		Action:     models.ActionServerCreate,
		Resource:   models.ResourceServer,
		ResourceID: server.ID.Hex(),
		Details: bson.M{
			"vm_name":      server.VMName,
			"project_name": server.ProjectName,
			"environment":  server.Environment,
			"ip":           server.IP,
			"cpu":          server.CPU,
			"ram":          server.RAM,
			"storage":      server.Storage,
			"total_cost":   server.TotalCost,
		},
		IPAddress: clientIP(c),
		UserAgent: c.GetHeader("User-Agent"),
		Status:    models.AuditStatusSuccess,
	})

	c.JSON(http.StatusCreated, server)
}

func GetServers(c *gin.Context) {
	collection := database.DB.Collection("servers")

	pageInt, err := strconv.ParseInt(c.DefaultQuery("page", "1"), 10, 64)
	if err != nil || pageInt < 1 {
		pageInt = 1
	}
	limitInt, err := strconv.ParseInt(c.DefaultQuery("limit", "10"), 10, 64)
	if err != nil || limitInt < 1 {
		limitInt = 10
	}
	// Cap at 10000 for report-tab bulk fetches
	if limitInt > 10000 {
		limitInt = 10000
	}

	// Build filter — optional full-text search across key fields
	filter := bson.M{}
	if q := c.Query("search"); q != "" {
		re := bson.M{"$regex": q, "$options": "i"}
		filter["$or"] = []bson.M{
			{"project_name": re},
			{"project_purpose": re},
			{"environment": re},
			{"vm_name": re},
			{"ip": re},
			{"hostname": re},
		}
	}

	total, err := collection.CountDocuments(context.Background(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count servers"})
		return
	}

	skip := (pageInt - 1) * limitInt
	findOptions := options.Find().
		SetLimit(limitInt).
		SetSkip(skip).
		SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := collection.Find(context.Background(), filter, findOptions)
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
	if servers == nil {
		servers = []models.Server{}
	}

	pages := (total + limitInt - 1) / limitInt

	c.JSON(http.StatusOK, gin.H{
		"servers": servers,
		"total":   total,
		"page":    pageInt,
		"limit":   limitInt,
		"pages":   pages,
	})
}

// GetProjects returns distinct project names sorted alphabetically,
// together with their server count and project purpose.
// Supports an optional ?search= query for name filtering.
func GetProjects(c *gin.Context) {
	col := database.DB.Collection("servers")

	matchStage := bson.D{}
	if q := c.Query("search"); q != "" {
		matchStage = bson.D{{
			Key:   "project_name",
			Value: bson.M{"$regex": q, "$options": "i"},
		}}
	}

	pipeline := []bson.D{
		{{Key: "$match", Value: matchStage}},
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: "$project_name"},
			{Key: "server_count", Value: bson.M{"$sum": 1}},
			{Key: "purpose", Value: bson.M{"$first": "$project_purpose"}},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "_id", Value: 1}}}},
	}

	cursor, err := col.Aggregate(context.Background(), pipeline)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch projects"})
		return
	}
	defer cursor.Close(context.Background())

	type projectRow struct {
		Name         string `json:"name"         bson:"_id"`
		ServerCount  int    `json:"server_count" bson:"server_count"`
		Purpose      string `json:"purpose"      bson:"purpose"`
	}
	var projects []projectRow
	if err = cursor.All(context.Background(), &projects); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode projects"})
		return
	}
	if projects == nil {
		projects = []projectRow{}
	}

	c.JSON(http.StatusOK, gin.H{
		"projects": projects,
		"total":    len(projects),
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
	if err = collection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&server); err != nil {
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

	// Fetch the existing record so we can include a before-snapshot in the audit.
	collection := database.DB.Collection("servers")
	var before models.Server
	_ = collection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&before)

	var server models.Server
	if err := c.ShouldBindJSON(&server); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	server.UpdatedAt = time.Now()

	result, err := collection.UpdateOne(
		context.Background(),
		bson.M{"_id": objectID},
		bson.M{"$set": server},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update server"})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	server.ID = objectID

	audit.Log(audit.Entry{
		UserID:     c.GetString("user_id"),
		Username:   c.GetString("username"),
		Action:     models.ActionServerUpdate,
		Resource:   models.ResourceServer,
		ResourceID: objectID.Hex(),
		Details: bson.M{
			"before": bson.M{
				"vm_name":      before.VMName,
				"project_name": before.ProjectName,
				"environment":  before.Environment,
				"ip":           before.IP,
				"cpu":          before.CPU,
				"ram":          before.RAM,
				"storage":      before.Storage,
				"total_cost":   before.TotalCost,
			},
			"after": bson.M{
				"vm_name":      server.VMName,
				"project_name": server.ProjectName,
				"environment":  server.Environment,
				"ip":           server.IP,
				"cpu":          server.CPU,
				"ram":          server.RAM,
				"storage":      server.Storage,
				"total_cost":   server.TotalCost,
			},
		},
		IPAddress: clientIP(c),
		UserAgent: c.GetHeader("User-Agent"),
		Status:    models.AuditStatusSuccess,
	})

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

	// Fetch the record before deleting so the audit has full context.
	var server models.Server
	_ = collection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&server)

	result, err := collection.DeleteOne(context.Background(), bson.M{"_id": objectID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete server"})
		return
	}

	if result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	audit.Log(audit.Entry{
		UserID:     c.GetString("user_id"),
		Username:   c.GetString("username"),
		Action:     models.ActionServerDelete,
		Resource:   models.ResourceServer,
		ResourceID: objectID.Hex(),
		Details: bson.M{
			"vm_name":      server.VMName,
			"project_name": server.ProjectName,
			"environment":  server.Environment,
			"ip":           server.IP,
		},
		IPAddress: clientIP(c),
		UserAgent: c.GetHeader("User-Agent"),
		Status:    models.AuditStatusSuccess,
	})

	c.JSON(http.StatusOK, gin.H{"message": "Server deleted successfully"})
}
