package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"server-management/internal/database"
	"server-management/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	mongoDriver "go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// GetAuditLogs returns a paginated, filterable list of audit log entries.
//
// Query params:
//
//	page       int    (default 1)
//	limit      int    (default 50, max 200)
//	user_id    string filter by user ID
//	username   string case-insensitive prefix match
//	action     string exact action constant (LOGIN, SERVER_CREATE, …)
//	resource   string AUTH | SERVER
//	status     string success | failure
//	date_from  string RFC3339 or YYYY-MM-DD lower bound (inclusive)
//	date_to    string RFC3339 or YYYY-MM-DD upper bound (inclusive)
func GetAuditLogs(c *gin.Context) {
	pageInt, _ := strconv.ParseInt(c.DefaultQuery("page", "1"), 10, 64)
	if pageInt < 1 {
		pageInt = 1
	}
	limitInt, _ := strconv.ParseInt(c.DefaultQuery("limit", "50"), 10, 64)
	switch {
	case limitInt < 1:
		limitInt = 50
	case limitInt > 200:
		limitInt = 200
	}

	filter := buildAuditFilter(c)

	col := database.DB.Collection("audit_logs")

	total, err := col.CountDocuments(context.Background(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count audit logs"})
		return
	}

	skip := (pageInt - 1) * limitInt
	findOpts := options.Find().
		SetSort(bson.D{{Key: "timestamp", Value: -1}}).
		SetSkip(skip).
		SetLimit(limitInt)

	cursor, err := col.Find(context.Background(), filter, findOpts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch audit logs"})
		return
	}
	defer cursor.Close(context.Background())

	var logs []models.AuditLog
	if err = cursor.All(context.Background(), &logs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode audit logs"})
		return
	}
	if logs == nil {
		logs = []models.AuditLog{}
	}

	pages := (total + limitInt - 1) / limitInt
	c.JSON(http.StatusOK, gin.H{
		"logs":  logs,
		"total": total,
		"page":  pageInt,
		"limit": limitInt,
		"pages": pages,
	})
}

// GetAuditStats returns aggregate statistics for the audit log collection.
//
// Optional query params: date_from, date_to (same format as GetAuditLogs).
func GetAuditStats(c *gin.Context) {
	ctx := context.Background()
	col := database.DB.Collection("audit_logs")

	// Build an optional time-range match stage
	baseMatch := bson.M{}
	if df := buildDateFilter(c); df != nil {
		baseMatch["timestamp"] = df
	}

	// ── Total count ──────────────────────────────────────────────────────────
	total, err := col.CountDocuments(ctx, baseMatch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count audit logs"})
		return
	}

	// ── By action ────────────────────────────────────────────────────────────
	byAction, err := runGroupCount(ctx, col, baseMatch, "$action")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to aggregate by action"})
		return
	}

	// ── By status ────────────────────────────────────────────────────────────
	byStatus, err := runGroupCount(ctx, col, baseMatch, "$status")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to aggregate by status"})
		return
	}

	// ── Top 10 most-active users ─────────────────────────────────────────────
	topUsers, err := runGroupCount(ctx, col, baseMatch, "$username")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to aggregate by user"})
		return
	}
	if len(topUsers) > 10 {
		topUsers = topUsers[:10]
	}

	// ── Daily activity – last 30 days ─────────────────────────────────────────
	dailyActivity, err := runDailyActivity(ctx, col)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to compute daily activity"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"total":          total,
		"by_action":      byAction,
		"by_status":      byStatus,
		"top_users":      topUsers,
		"daily_activity": dailyActivity,
	})
}

// ── private helpers ──────────────────────────────────────────────────────────

// buildAuditFilter constructs a MongoDB filter document from query parameters.
func buildAuditFilter(c *gin.Context) bson.M {
	filter := bson.M{}

	if v := c.Query("user_id"); v != "" {
		filter["user_id"] = v
	}
	if v := c.Query("username"); v != "" {
		filter["username"] = bson.M{"$regex": primitive.Regex{Pattern: v, Options: "i"}}
	}
	if v := c.Query("action"); v != "" {
		filter["action"] = v
	}
	if v := c.Query("resource"); v != "" {
		filter["resource"] = v
	}
	if v := c.Query("status"); v != "" {
		filter["status"] = v
	}

	if df := buildDateFilter(c); df != nil {
		filter["timestamp"] = df
	}

	return filter
}

// buildDateFilter creates a MongoDB range filter for the timestamp field.
func buildDateFilter(c *gin.Context) bson.M {
	df := bson.M{}
	if v := c.Query("date_from"); v != "" {
		if t := parseQueryDate(v); !t.IsZero() {
			df["$gte"] = t
		}
	}
	if v := c.Query("date_to"); v != "" {
		if t := parseQueryDate(v); !t.IsZero() {
			// Include the entire end day
			df["$lte"] = t.Add(24*time.Hour - time.Nanosecond)
		}
	}
	if len(df) == 0 {
		return nil
	}
	return df
}

// parseQueryDate parses RFC3339 or YYYY-MM-DD strings into UTC time.Time.
func parseQueryDate(s string) time.Time {
	for _, layout := range []string{time.RFC3339, "2006-01-02"} {
		if t, err := time.Parse(layout, s); err == nil {
			return t.UTC()
		}
	}
	return time.Time{}
}

// groupCountResult is one row from a $group aggregation.
type groupCountResult struct {
	Key   string `json:"key"   bson:"_id"`
	Count int64  `json:"count" bson:"count"`
}

// runGroupCount runs a simple { $group: { _id: field, count: { $sum: 1 } } }
// aggregation, sorted descending by count.
func runGroupCount(ctx context.Context, col *mongoDriver.Collection, match bson.M, field string) ([]groupCountResult, error) {
	pipeline := mongoDriver.Pipeline{
		{{Key: "$match", Value: match}},
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: field},
			{Key: "count", Value: bson.M{"$sum": 1}},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "count", Value: -1}}}},
	}

	cursor, err := col.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []groupCountResult
	if err = cursor.All(ctx, &results); err != nil {
		return nil, err
	}
	if results == nil {
		results = []groupCountResult{}
	}
	return results, nil
}

// dailyActivityResult is one row from the daily aggregation.
type dailyActivityResult struct {
	Date  string `json:"date"  bson:"_id"`
	Count int64  `json:"count" bson:"count"`
}

// runDailyActivity returns per-day event counts for the last 30 days.
func runDailyActivity(ctx context.Context, col *mongoDriver.Collection) ([]dailyActivityResult, error) {
	since := time.Now().UTC().Add(-30 * 24 * time.Hour)

	pipeline := mongoDriver.Pipeline{
		{{Key: "$match", Value: bson.M{
			"timestamp": bson.M{"$gte": since},
		}}},
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: bson.M{
				"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$timestamp"},
			}},
			{Key: "count", Value: bson.M{"$sum": 1}},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "_id", Value: 1}}}},
	}

	cursor, err := col.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []dailyActivityResult
	if err = cursor.All(ctx, &results); err != nil {
		return nil, err
	}
	if results == nil {
		results = []dailyActivityResult{}
	}
	return results, nil
}
