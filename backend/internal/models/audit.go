package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Action constants
const (
	ActionLogin        = "LOGIN"
	ActionLoginFailed  = "LOGIN_FAILED"
	ActionRegister     = "REGISTER"
	ActionServerCreate = "SERVER_CREATE"
	ActionServerUpdate = "SERVER_UPDATE"
	ActionServerDelete = "SERVER_DELETE"
)

// Resource constants
const (
	ResourceAuth   = "AUTH"
	ResourceServer = "SERVER"
)

// Status constants
const (
	AuditStatusSuccess = "success"
	AuditStatusFailure = "failure"
)

// AuditLog records every significant user action in the system.
type AuditLog struct {
	ID         primitive.ObjectID `json:"id"          bson:"_id,omitempty"`
	UserID     string             `json:"user_id"     bson:"user_id"`
	Username   string             `json:"username"    bson:"username"`
	Action     string             `json:"action"      bson:"action"`
	Resource   string             `json:"resource"    bson:"resource"`
	ResourceID string             `json:"resource_id" bson:"resource_id"`
	Details    bson.M             `json:"details"     bson:"details"`
	IPAddress  string             `json:"ip_address"  bson:"ip_address"`
	UserAgent  string             `json:"user_agent"  bson:"user_agent"`
	Status     string             `json:"status"      bson:"status"` // "success" | "failure"
	Timestamp  time.Time          `json:"timestamp"   bson:"timestamp"`
}
