package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Server struct {
	ID           primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	ProjectName  string             `json:"project_name" bson:"project_name" binding:"required"`
	Purpose      string             `json:"project_purpose" bson:"project_purpose" binding:"required"`
	Environment  string             `json:"environment" bson:"environment" binding:"required"`
	VMName       string             `json:"vm_name" bson:"vm_name" binding:"required"`
	CPU          int                `json:"cpu" bson:"cpu" binding:"required"`
	RAM          int                `json:"ram" bson:"ram" binding:"required"`
	Storage      int                `json:"storage" bson:"storage" binding:"required"`
	TotalCost    float64            `json:"total_cost" bson:"total_cost" binding:"required"`
	OSVersion    string             `json:"os_version" bson:"os_version" binding:"required"`
	IP           string             `json:"ip" bson:"ip" binding:"required"`
	Hostname     string             `json:"hostname" bson:"hostname" binding:"required"`
	Username     string             `json:"username" bson:"username" binding:"required"`
	Password     string             `json:"password" bson:"password" binding:"required"`
	ServerNo     string             `json:"server_no" bson:"server_no" binding:"required"`
	CreatedBy    string             `json:"created_by" bson:"created_by" binding:"required"`
	Remarks      string             `json:"remarks" bson:"remarks"`
	DeleteDate   *time.Time         `json:"delete_date" bson:"delete_date"`
	CreatedAt    time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt    time.Time          `json:"updated_at" bson:"updated_at"`
}

type User struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Username  string             `json:"username" bson:"username" binding:"required"`
	Email     string             `json:"email" bson:"email" binding:"required,email"`
	Password  string             `json:"password" bson:"password" binding:"required,min=6"`
	Role      string             `json:"role" bson:"role"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}