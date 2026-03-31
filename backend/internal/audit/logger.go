// Package audit provides a lightweight, fire-and-forget audit logger.
// Every call to Log writes an AuditLog document to MongoDB in a background
// goroutine so it never blocks the request handler.
package audit

import (
	"context"
	"log"
	"time"

	"server-management/internal/database"
	"server-management/internal/models"

	"go.mongodb.org/mongo-driver/bson"
)

// Entry holds all the information needed to create one audit record.
type Entry struct {
	UserID     string
	Username   string
	Action     string
	Resource   string
	ResourceID string
	Details    bson.M
	IPAddress  string
	UserAgent  string
	Status     string // models.AuditStatusSuccess | models.AuditStatusFailure
}

// Log persists an audit entry asynchronously.
// It never panics; errors are printed to the server log only.
func Log(e Entry) {
	go func() {
		record := models.AuditLog{
			UserID:     e.UserID,
			Username:   e.Username,
			Action:     e.Action,
			Resource:   e.Resource,
			ResourceID: e.ResourceID,
			Details:    e.Details,
			IPAddress:  e.IPAddress,
			UserAgent:  e.UserAgent,
			Status:     e.Status,
			Timestamp:  time.Now().UTC(),
		}

		col := database.DB.Collection("audit_logs")
		if _, err := col.InsertOne(context.Background(), record); err != nil {
			log.Printf("[audit] failed to write log (action=%s user=%s): %v", e.Action, e.Username, err)
		}
	}()
}
