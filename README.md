# Server Management System

A full-stack application for managing server infrastructure with Go backend, Next.js frontend, and MongoDB database.

## Features

- **Authentication**: User registration and login with JWT tokens
- **Server Management**: CRUD operations for server records
- **Responsive UI**: Modern interface built with Next.js and Tailwind CSS
- **Database**: MongoDB for data persistence
- **Containerized**: Docker and Docker Compose for easy deployment

## Server Fields

The application manages servers with the following fields:
- Project Name
- Project Purpose
- Environment (Development/Staging/Production)
- VM Name
- CPU (cores)
- RAM (GB)
- Storage (GB)
- Total Cost ($)
- OS Version
- IP Address
- Hostname
- Username
- Password
- Server No
- Created By
- Remarks
- Delete Date
- Created At / Updated At (auto-generated)

## Tech Stack

### Backend
- **Go 1.21** with Gin framework
- **MongoDB** with official Go driver
- **JWT** for authentication
- **bcrypt** for password hashing
- **CORS** support

### Frontend
- **Next.js 14** with TypeScript
- **Tailwind CSS** for styling
- **React Hook Form** for form handling
- **Axios** for API calls
- **React Hot Toast** for notifications
- **Heroicons** for icons

### Database
- **MongoDB 7.0**

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Git

### 1. Clone the repository
```bash
git clone <repository-url>
cd server-management
```

### 2. Start the application
```bash
docker-compose up --build
```

This will start:
- MongoDB on port 27017
- Go backend on port 8080
- Next.js frontend on port 3000

### 3. Access the application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- MongoDB: localhost:27017

### 4. Create your first account
1. Go to http://localhost:3000
2. Click "Register here" to create an account
3. Login with your credentials
4. Start managing your servers!

## Development Setup

### Backend Development
```bash
cd backend
go mod tidy
go run cmd/server/main.go
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Database
MongoDB will be available at `mongodb://admin:password123@localhost:27017/servermgmt`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Servers (Protected)
- `GET /api/servers` - Get all servers (with pagination)
- `POST /api/servers` - Create new server
- `GET /api/servers/:id` - Get server by ID
- `PUT /api/servers/:id` - Update server
- `DELETE /api/servers/:id` - Delete server

## Environment Variables

### Backend
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `PORT` - Server port (default: 8080)

### Frontend
- `NEXT_PUBLIC_API_URL` - Backend API URL

## Docker Configuration

The application uses multi-stage Docker builds for optimization:
- **Backend**: Uses Go 1.21 Alpine for building and minimal Alpine for runtime
- **Frontend**: Uses Node.js 18 Alpine with Next.js standalone output
- **Database**: MongoDB 7.0 with persistent volume

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- CORS protection
- Input validation
- Protected API routes

## Production Deployment

1. Update environment variables in `docker-compose.yml`
2. Change default passwords and secrets
3. Configure proper MongoDB authentication
4. Set up reverse proxy (nginx) for HTTPS
5. Configure backup strategy for MongoDB

## Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 3000, 8080, and 27017 are available
2. **MongoDB connection**: Wait for MongoDB to fully start before backend
3. **CORS errors**: Check API URL configuration in frontend

### Logs
```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.