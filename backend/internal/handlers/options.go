package handlers

import (
	"context"
	"net/http"
	"regexp"
	"strings"
	"time"

	"server-management/internal/audit"
	"server-management/internal/database"
	"server-management/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	mongooptions "go.mongodb.org/mongo-driver/mongo/options"
)

// caseInsensitiveFilter builds a case-insensitive exact-match filter for "name".
func caseInsensitiveFilter(name string) bson.M {
	return bson.M{
		"name": bson.M{
			"$regex":   "^" + regexp.QuoteMeta(strings.TrimSpace(name)) + "$",
			"$options": "i",
		},
	}
}

// ── Environments ─────────────────────────────────────────────────────────────

func GetEnvironments(c *gin.Context) {
	col := database.DB.Collection("environments")
	cursor, err := col.Find(context.Background(), bson.M{},
		mongooptions.Find().SetSort(bson.D{{Key: "name", Value: 1}}))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch environments"})
		return
	}
	defer cursor.Close(context.Background())

	var envs []models.Environment
	if err = cursor.All(context.Background(), &envs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode environments"})
		return
	}
	if envs == nil {
		envs = []models.Environment{}
	}
	c.JSON(http.StatusOK, gin.H{"environments": envs})
}

func CreateEnvironment(c *gin.Context) {
	var env models.Environment
	if err := c.ShouldBindJSON(&env); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	env.Name = strings.TrimSpace(env.Name)
	if env.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name is required"})
		return
	}

	col := database.DB.Collection("environments")

	// Uniqueness check (case-insensitive)
	count, err := col.CountDocuments(context.Background(), caseInsensitiveFilter(env.Name))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check for duplicates"})
		return
	}
	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Environment name already exists"})
		return
	}

	env.CreatedAt = time.Now()
	result, err := col.InsertOne(context.Background(), env)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create environment"})
		return
	}
	env.ID = result.InsertedID.(primitive.ObjectID)

	audit.Log(audit.Entry{
		UserID:     c.GetString("user_id"),
		Username:   c.GetString("username"),
		Action:     models.ActionEnvironmentCreate,
		Resource:   models.ResourceEnvironment,
		ResourceID: env.ID.Hex(),
		Details:    bson.M{"name": env.Name},
		IPAddress:  clientIP(c),
		UserAgent:  c.GetHeader("User-Agent"),
		Status:     models.AuditStatusSuccess,
	})

	c.JSON(http.StatusCreated, env)
}

func UpdateEnvironment(c *gin.Context) {
	id := c.Param("id")
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var body struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body.Name = strings.TrimSpace(body.Name)
	if body.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name is required"})
		return
	}

	col := database.DB.Collection("environments")

	// Fetch old name before updating (needed for cascade)
	var existing models.Environment
	if err := col.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&existing); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Environment not found"})
		return
	}

	// Uniqueness check — exclude the current document
	dup, err := col.CountDocuments(context.Background(), bson.M{
		"_id": bson.M{"$ne": objectID},
		"name": bson.M{
			"$regex":   "^" + regexp.QuoteMeta(body.Name) + "$",
			"$options": "i",
		},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check for duplicates"})
		return
	}
	if dup > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Environment name already exists"})
		return
	}

	// Update the environment record
	res, err := col.UpdateOne(
		context.Background(),
		bson.M{"_id": objectID},
		bson.M{"$set": bson.M{"name": body.Name}},
	)
	if err != nil || res.MatchedCount == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update environment"})
		return
	}

	// Cascade: update all servers that reference the old environment name
	serverCol := database.DB.Collection("servers")
	cascadeResult, err := serverCol.UpdateMany(
		context.Background(),
		bson.M{"environment": existing.Name},
		bson.M{"$set": bson.M{"environment": body.Name, "updated_at": time.Now()}},
	)
	serversUpdated := int64(0)
	if err == nil {
		serversUpdated = cascadeResult.ModifiedCount
	}

	audit.Log(audit.Entry{
		UserID:     c.GetString("user_id"),
		Username:   c.GetString("username"),
		Action:     models.ActionEnvironmentUpdate,
		Resource:   models.ResourceEnvironment,
		ResourceID: id,
		Details: bson.M{
			"old_name":        existing.Name,
			"new_name":        body.Name,
			"servers_updated": serversUpdated,
		},
		IPAddress: clientIP(c),
		UserAgent: c.GetHeader("User-Agent"),
		Status:    models.AuditStatusSuccess,
	})

	c.JSON(http.StatusOK, gin.H{
		"id":              id,
		"name":            body.Name,
		"servers_updated": serversUpdated,
	})
}

func DeleteEnvironment(c *gin.Context) {
	id := c.Param("id")
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	col := database.DB.Collection("environments")

	// Fetch the record so we have the name for the dependency check
	var env models.Environment
	if err := col.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&env); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Environment not found"})
		return
	}

	// Block deletion if any server still references this environment
	serverCol := database.DB.Collection("servers")
	usedBy, err := serverCol.CountDocuments(context.Background(), bson.M{"environment": env.Name})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check server dependencies"})
		return
	}
	if usedBy > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"error":          "Cannot delete: environment is in use",
			"dependency":     true,
			"servers_count":  usedBy,
			"environment":    env.Name,
		})
		return
	}

	result, err := col.DeleteOne(context.Background(), bson.M{"_id": objectID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete environment"})
		return
	}
	if result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Environment not found"})
		return
	}

	audit.Log(audit.Entry{
		UserID:     c.GetString("user_id"),
		Username:   c.GetString("username"),
		Action:     models.ActionEnvironmentDelete,
		Resource:   models.ResourceEnvironment,
		ResourceID: id,
		Details:    bson.M{"name": env.Name},
		IPAddress:  clientIP(c),
		UserAgent:  c.GetHeader("User-Agent"),
		Status:     models.AuditStatusSuccess,
	})

	c.JSON(http.StatusOK, gin.H{"message": "Environment deleted"})
}

// ── Physical Servers ─────────────────────────────────────────────────────────

func GetPhysicalServers(c *gin.Context) {
	col := database.DB.Collection("physical_servers")
	cursor, err := col.Find(context.Background(), bson.M{},
		mongooptions.Find().SetSort(bson.D{{Key: "name", Value: 1}}))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch physical servers"})
		return
	}
	defer cursor.Close(context.Background())

	var servers []models.PhysicalServer
	if err = cursor.All(context.Background(), &servers); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode physical servers"})
		return
	}
	if servers == nil {
		servers = []models.PhysicalServer{}
	}
	c.JSON(http.StatusOK, gin.H{"physical_servers": servers})
}

func CreatePhysicalServer(c *gin.Context) {
	var ps models.PhysicalServer
	if err := c.ShouldBindJSON(&ps); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ps.Name = strings.TrimSpace(ps.Name)
	if ps.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name is required"})
		return
	}

	col := database.DB.Collection("physical_servers")

	// Uniqueness check (case-insensitive)
	count, err := col.CountDocuments(context.Background(), caseInsensitiveFilter(ps.Name))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check for duplicates"})
		return
	}
	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Physical server name already exists"})
		return
	}

	ps.CreatedAt = time.Now()
	result, err := col.InsertOne(context.Background(), ps)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create physical server"})
		return
	}
	ps.ID = result.InsertedID.(primitive.ObjectID)

	audit.Log(audit.Entry{
		UserID:     c.GetString("user_id"),
		Username:   c.GetString("username"),
		Action:     models.ActionPhysicalServerCreate,
		Resource:   models.ResourcePhysicalServer,
		ResourceID: ps.ID.Hex(),
		Details:    bson.M{"name": ps.Name},
		IPAddress:  clientIP(c),
		UserAgent:  c.GetHeader("User-Agent"),
		Status:     models.AuditStatusSuccess,
	})

	c.JSON(http.StatusCreated, ps)
}

func UpdatePhysicalServer(c *gin.Context) {
	id := c.Param("id")
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var body struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body.Name = strings.TrimSpace(body.Name)
	if body.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name is required"})
		return
	}

	col := database.DB.Collection("physical_servers")

	// Fetch old name before updating (needed for cascade)
	var existing models.PhysicalServer
	if err := col.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&existing); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Physical server not found"})
		return
	}

	// Uniqueness check — exclude the current document
	dup, err := col.CountDocuments(context.Background(), bson.M{
		"_id": bson.M{"$ne": objectID},
		"name": bson.M{
			"$regex":   "^" + regexp.QuoteMeta(body.Name) + "$",
			"$options": "i",
		},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check for duplicates"})
		return
	}
	if dup > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Physical server name already exists"})
		return
	}

	// Update the physical server record
	res, err := col.UpdateOne(
		context.Background(),
		bson.M{"_id": objectID},
		bson.M{"$set": bson.M{"name": body.Name}},
	)
	if err != nil || res.MatchedCount == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update physical server"})
		return
	}

	// Cascade: update all servers that reference the old physical_server name
	serverCol := database.DB.Collection("servers")
	cascadeResult, err := serverCol.UpdateMany(
		context.Background(),
		bson.M{"physical_server": existing.Name},
		bson.M{"$set": bson.M{"physical_server": body.Name, "updated_at": time.Now()}},
	)
	serversUpdated := int64(0)
	if err == nil {
		serversUpdated = cascadeResult.ModifiedCount
	}

	audit.Log(audit.Entry{
		UserID:     c.GetString("user_id"),
		Username:   c.GetString("username"),
		Action:     models.ActionPhysicalServerUpdate,
		Resource:   models.ResourcePhysicalServer,
		ResourceID: id,
		Details: bson.M{
			"old_name":        existing.Name,
			"new_name":        body.Name,
			"servers_updated": serversUpdated,
		},
		IPAddress: clientIP(c),
		UserAgent: c.GetHeader("User-Agent"),
		Status:    models.AuditStatusSuccess,
	})

	c.JSON(http.StatusOK, gin.H{
		"id":              id,
		"name":            body.Name,
		"servers_updated": serversUpdated,
	})
}

func DeletePhysicalServer(c *gin.Context) {
	id := c.Param("id")
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	col := database.DB.Collection("physical_servers")

	// Fetch the record so we have the name for the dependency check
	var ps models.PhysicalServer
	if err := col.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&ps); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Physical server not found"})
		return
	}

	// Block deletion if any server still references this physical server
	serverCol := database.DB.Collection("servers")
	usedBy, err := serverCol.CountDocuments(context.Background(), bson.M{"physical_server": ps.Name})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check server dependencies"})
		return
	}
	if usedBy > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"error":           "Cannot delete: physical server is in use",
			"dependency":      true,
			"servers_count":   usedBy,
			"physical_server": ps.Name,
		})
		return
	}

	result, err := col.DeleteOne(context.Background(), bson.M{"_id": objectID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete physical server"})
		return
	}
	if result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Physical server not found"})
		return
	}

	audit.Log(audit.Entry{
		UserID:     c.GetString("user_id"),
		Username:   c.GetString("username"),
		Action:     models.ActionPhysicalServerDelete,
		Resource:   models.ResourcePhysicalServer,
		ResourceID: id,
		Details:    bson.M{"name": ps.Name},
		IPAddress:  clientIP(c),
		UserAgent:  c.GetHeader("User-Agent"),
		Status:     models.AuditStatusSuccess,
	})

	c.JSON(http.StatusOK, gin.H{"message": "Physical server deleted"})
}
