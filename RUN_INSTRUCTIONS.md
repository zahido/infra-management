# How to Run Infra Management Project

## Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Must be installed and running)

## Quick Start (Windows)
1. Open PowerShell to the project root.
2. Run the start script:
   ```powershell
   .\start.ps1
   ```

## Manual Start
If you prefer running commands manually:
```bash
docker-compose up -d --build
```

## Accessing the Application
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8080](http://localhost:8080)

## Troubleshooting
- **Ports already in use**: ensure ports 3000, 8080, and 27017 are free.
- **Database Connection**: The backend waits for MongoDB to be ready. Check logs with `docker-compose logs -f backend`.
