# Check if Docker is running
$dockerStats = docker info
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker is not running. Please start Docker Desktop and try again."
    exit 1
}

Write-Host "Building and starting containers..."
docker-compose up -d --build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nProject started successfully!" -ForegroundColor Green
    Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "Backend: http://localhost:8080" -ForegroundColor Cyan
    Write-Host "Mongo Express (if enabled): http://localhost:8081" -ForegroundColor Gray
} else {
    Write-Error "Failed to start project. Check the logs above."
}
