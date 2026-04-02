package handlers

import (
	"context"
	"net/http"
	"os"
	"time"

	"server-management/internal/audit"
	"server-management/internal/database"
	"server-management/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

func Register(c *gin.Context) {
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	collection := database.DB.Collection("users")
	var existingUser models.User
	err := collection.FindOne(context.Background(), bson.M{
		"$or": []bson.M{
			{"username": user.Username},
			{"email": user.Email},
		},
	}).Decode(&existingUser)

	if err == nil {
		audit.Log(audit.Entry{
			Username:  user.Username,
			Action:    models.ActionRegister,
			Resource:  models.ResourceAuth,
			Details:   bson.M{"reason": "username or email already exists"},
			IPAddress: clientIP(c),
			UserAgent: c.GetHeader("User-Agent"),
			Status:    models.AuditStatusFailure,
		})
		c.JSON(http.StatusConflict, gin.H{"error": "User already exists"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	user.Password = string(hashedPassword)
	user.Role = "user"
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	result, err := collection.InsertOne(context.Background(), user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	user.ID = result.InsertedID.(primitive.ObjectID)
	user.Password = ""

	audit.Log(audit.Entry{
		UserID:     user.ID.Hex(),
		Username:   user.Username,
		Action:     models.ActionRegister,
		Resource:   models.ResourceAuth,
		ResourceID: user.ID.Hex(),
		Details:    bson.M{"email": user.Email, "role": user.Role},
		IPAddress:  clientIP(c),
		UserAgent:  c.GetHeader("User-Agent"),
		Status:     models.AuditStatusSuccess,
	})

	c.JSON(http.StatusCreated, gin.H{"message": "User created successfully", "user": user})
}

func Login(c *gin.Context) {
	var loginReq models.LoginRequest
	if err := c.ShouldBindJSON(&loginReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	collection := database.DB.Collection("users")
	var user models.User
	err := collection.FindOne(context.Background(), bson.M{"username": loginReq.Username}).Decode(&user)
	if err != nil {
		audit.Log(audit.Entry{
			Username:  loginReq.Username,
			Action:    models.ActionLoginFailed,
			Resource:  models.ResourceAuth,
			Details:   bson.M{"reason": "user not found"},
			IPAddress: clientIP(c),
			UserAgent: c.GetHeader("User-Agent"),
			Status:    models.AuditStatusFailure,
		})
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(loginReq.Password)); err != nil {
		audit.Log(audit.Entry{
			UserID:    user.ID.Hex(),
			Username:  user.Username,
			Action:    models.ActionLoginFailed,
			Resource:  models.ResourceAuth,
			Details:   bson.M{"reason": "wrong password"},
			IPAddress: clientIP(c),
			UserAgent: c.GetHeader("User-Agent"),
			Status:    models.AuditStatusFailure,
		})
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-super-secret-jwt-key-change-in-production"
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":  user.ID.Hex(),
		"username": user.Username,
		"exp":      time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	audit.Log(audit.Entry{
		UserID:    user.ID.Hex(),
		Username:  user.Username,
		Action:    models.ActionLogin,
		Resource:  models.ResourceAuth,
		Details:   bson.M{"role": user.Role},
		IPAddress: clientIP(c),
		UserAgent: c.GetHeader("User-Agent"),
		Status:    models.AuditStatusSuccess,
	})

	user.Password = ""
	c.JSON(http.StatusOK, models.LoginResponse{
		Token: tokenString,
		User:  user,
	})
}

func ChangePassword(c *gin.Context) {
	var req struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword     string `json:"new_password"     binding:"required,min=6"`
		ConfirmPassword string `json:"confirm_password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.NewPassword != req.ConfirmPassword {
		c.JSON(http.StatusBadRequest, gin.H{"error": "New passwords do not match"})
		return
	}

	userID, err := primitive.ObjectIDFromHex(c.GetString("user_id"))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid session"})
		return
	}

	collection := database.DB.Collection("users")
	var user models.User
	if err := collection.FindOne(context.Background(), bson.M{"_id": userID}).Decode(&user); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.CurrentPassword)); err != nil {
		audit.Log(audit.Entry{
			UserID:    user.ID.Hex(),
			Username:  user.Username,
			Action:    models.ActionPasswordChange,
			Resource:  models.ResourceAuth,
			Details:   bson.M{"reason": "wrong current password"},
			IPAddress: clientIP(c),
			UserAgent: c.GetHeader("User-Agent"),
			Status:    models.AuditStatusFailure,
		})
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Current password is incorrect"})
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	_, err = collection.UpdateOne(
		context.Background(),
		bson.M{"_id": userID},
		bson.M{"$set": bson.M{"password": string(hashed), "updated_at": time.Now()}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	audit.Log(audit.Entry{
		UserID:    user.ID.Hex(),
		Username:  user.Username,
		Action:    models.ActionPasswordChange,
		Resource:  models.ResourceAuth,
		IPAddress: clientIP(c),
		UserAgent: c.GetHeader("User-Agent"),
		Status:    models.AuditStatusSuccess,
	})

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}

// clientIP extracts the real client IP, honouring X-Forwarded-For / X-Real-IP
// headers set by reverse proxies before falling back to RemoteAddr.
func clientIP(c *gin.Context) string {
	return c.ClientIP()
}
