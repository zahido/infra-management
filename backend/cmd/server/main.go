package main

import (
	"log"
	"os"
	"strings"
	"time"

	"server-management/internal/database"
	"server-management/internal/handlers"
	"server-management/internal/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Set Gin mode based on environment
	env := os.Getenv("APP_ENV")
	if env == "" {
		env = "development"
	}

	if env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Connect to database
	database.Connect()

	// Initialize Gin router
	r := gin.Default()

	// Configure CORS based on environment
	corsConfig := setupCORS(env)
	r.Use(cors.New(corsConfig))

	// Add security headers middleware
	r.Use(securityHeadersMiddleware())

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
			"env":    env,
			"time":   time.Now().Unix(),
		})
	})

	// Auth routes
	auth := r.Group("/api/auth")
	{
		auth.POST("/register", handlers.Register)
		auth.POST("/login", handlers.Login)
	}

	// Protected routes
	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware())
	{
		// Server management routes
		servers := api.Group("/servers")
		{
			servers.POST("", handlers.CreateServer)
			servers.GET("", handlers.GetServers)
			servers.GET("/:id", handlers.GetServer)
			servers.PUT("/:id", handlers.UpdateServer)
			servers.DELETE("/:id", handlers.DeleteServer)
		}
	}

	// Get port from environment or default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s in %s mode", port, env)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

// setupCORS configures CORS based on environment
func setupCORS(env string) cors.Config {
	// Base CORS configuration
	config := cors.Config{
		AllowMethods: []string{
			"GET",
			"POST",
			"PUT",
			"PATCH",
			"DELETE",
			"HEAD",
			"OPTIONS",
		},
		AllowHeaders: []string{
			"Origin",
			"Content-Length",
			"Content-Type",
			"Authorization",
			"X-Requested-With",
			"X-CSRF-Token",
			"Accept",
			"Accept-Language",
			"X-Forwarded-For",
			"X-Real-IP",
		},
		ExposeHeaders: []string{
			"Content-Length",
			"Content-Type",
			"Authorization",
		},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour, // Preflight cache duration
	}

	switch env {
	case "production":
		// Production - strict CORS
		allowedOrigins := getEnvAsSlice("ALLOWED_ORIGINS", []string{
			"https://yourdomain.com",
			"https://app.yourdomain.com",
			"https://api.yourdomain.com",
		})

		// Also allow custom domains if needed
		if customDomains := os.Getenv("CUSTOM_DOMAINS"); customDomains != "" {
			allowedOrigins = append(allowedOrigins, strings.Split(customDomains, ",")...)
		}

		config.AllowOrigins = allowedOrigins

		// Add security headers for production
		config.AllowOrigins = cleanOrigins(config.AllowOrigins)

		log.Printf("Production CORS configured for %d origins", len(config.AllowOrigins))

	case "staging", "alpha":
		// Staging - more permissive but still controlled
		allowedOrigins := getEnvAsSlice("ALLOWED_ORIGINS", []string{
			"https://staging.yourdomain.com",
			"https://alpha.yourdomain.com",
			"http://localhost:3000",
			"http://localhost:3001",
			"http://127.0.0.1:3000",
			"http://127.0.0.1:3001",
		})

		// Allow preview deployments
		if previewDomains := os.Getenv("PREVIEW_DOMAINS"); previewDomains != "" {
			allowedOrigins = append(allowedOrigins, strings.Split(previewDomains, ",")...)
		}

		config.AllowOrigins = allowedOrigins
		log.Printf("Staging CORS configured: allowing %v", config.AllowOrigins)

	case "development":
		fallthrough
	default:
		// Development - permissive CORS
		// Note: For development with credentials, use specific origins instead of "*"
		if os.Getenv("CORS_ALLOW_ALL") == "true" {
			config.AllowOrigins = []string{"*"}
			// When using "*", credentials must be false
			config.AllowCredentials = false
		} else {
			config.AllowOrigins = []string{
				"http://localhost:3000",
				"http://localhost:3001",
				"http://127.0.0.1:3000",
				"http://127.0.0.1:3001",
				"http://localhost:8080",
				"http://localhost:5000",
				"http://localhost:5173", // Vite default
				"http://localhost:5174",
			}
		}
		log.Printf("Development CORS configured: allowing %v", config.AllowOrigins)
	}

	// Add CORS debug logging in non-production environments
	if env != "production" {
		log.Printf("CORS Config: AllowOrigins=%v, AllowCredentials=%v",
			config.AllowOrigins, config.AllowCredentials)
	}

	return config
}

// securityHeadersMiddleware adds security headers to responses
func securityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Security headers
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")

		// Only add HSTS in production
		if os.Getenv("APP_ENV") == "production" {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		}

		// Content Security Policy (adjust as needed)
		c.Header("Content-Security-Policy", "default-src 'self'")

		c.Next()
	}
}

// Helper function to get environment variable as slice with default
func getEnvAsSlice(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		parts := strings.Split(value, ",")
		// Trim spaces
		for i, part := range parts {
			parts[i] = strings.TrimSpace(part)
		}
		return parts
	}
	return defaultValue
}

// Helper function to clean and validate origins
func cleanOrigins(origins []string) []string {
	cleaned := make([]string, 0, len(origins))
	for _, origin := range origins {
		origin = strings.TrimSpace(origin)
		if origin != "" {
			// Basic validation
			if strings.HasPrefix(origin, "http://") || strings.HasPrefix(origin, "https://") {
				cleaned = append(cleaned, origin)
			} else {
				log.Printf("Warning: Invalid origin format (missing http/https): %s", origin)
			}
		}
	}
	return cleaned
}
