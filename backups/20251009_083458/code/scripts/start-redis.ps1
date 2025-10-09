# LocalEx Redis Startup Script
# Starts Redis using Docker Compose for easy development setup

param(
    [Parameter(Mandatory=$false)]
    [switch]$WithCommander = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$Detached = $true
)

Write-Host "LocalEx Redis Startup Script" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# Check if Docker is running
try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not found"
    }
    Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found or not running" -ForegroundColor Red
    Write-Host "Please install Docker Desktop and ensure it's running" -ForegroundColor Yellow
    Write-Host "Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Cyan
    exit 1
}

# Check if docker-compose file exists
if (-not (Test-Path "docker-compose.redis.yml")) {
    Write-Host "❌ docker-compose.redis.yml not found" -ForegroundColor Red
    Write-Host "Please ensure you're running this script from the project root directory" -ForegroundColor Yellow
    exit 1
}

try {
    # Stop any existing Redis containers
    Write-Host "`nStopping existing Redis containers..." -ForegroundColor Yellow
    docker-compose -f docker-compose.redis.yml down 2>$null

    # Start Redis
    Write-Host "Starting Redis with Docker Compose..." -ForegroundColor Green
    
    if ($WithCommander) {
        Write-Host "Including Redis Commander for web interface..." -ForegroundColor Cyan
        if ($Detached) {
            docker-compose -f docker-compose.redis.yml up -d
        } else {
            docker-compose -f docker-compose.redis.yml up
        }
    } else {
        Write-Host "Starting Redis only..." -ForegroundColor Cyan
        if ($Detached) {
            docker-compose -f docker-compose.redis.yml up -d redis
        } else {
            docker-compose -f docker-compose.redis.yml up redis
        }
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Redis started successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Redis Connection Details:" -ForegroundColor Cyan
        Write-Host "- Host: localhost" -ForegroundColor White
        Write-Host "- Port: 6379" -ForegroundColor White
        Write-Host "- Password: LocalExRedis2024!" -ForegroundColor White
        Write-Host "- Databases: 0 (cache), 1 (queue), 2 (session)" -ForegroundColor White
        
        if ($WithCommander) {
            Write-Host ""
            Write-Host "Redis Commander (Web Interface):" -ForegroundColor Cyan
            Write-Host "- URL: http://localhost:8081" -ForegroundColor White
            Write-Host "- Password: LocalExRedis2024!" -ForegroundColor White
        }
        
        Write-Host ""
        Write-Host "Next Steps:" -ForegroundColor Yellow
        Write-Host "- Test Redis connection: npm run redis:test" -ForegroundColor White
        Write-Host "- Check Redis status: docker-compose -f docker-compose.redis.yml ps" -ForegroundColor White
        Write-Host "- View Redis logs: docker-compose -f docker-compose.redis.yml logs redis" -ForegroundColor White
        Write-Host "- Stop Redis: docker-compose -f docker-compose.redis.yml down" -ForegroundColor White
        
        # Wait a moment for Redis to fully start
        Start-Sleep -Seconds 3
        
        # Test Redis connection
        Write-Host "`nTesting Redis connection..." -ForegroundColor Yellow
        $testResult = docker exec localex-redis redis-cli -a "LocalExRedis2024!" ping 2>$null
        if ($testResult -eq "PONG") {
            Write-Host "✅ Redis connection test successful!" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Redis connection test failed, but Redis may still be starting up" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "❌ Failed to start Redis" -ForegroundColor Red
        Write-Host "Check Docker logs for more information" -ForegroundColor Yellow
        exit 1
    }
    
} catch {
    Write-Host "`n❌ Error starting Redis: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`nRedis startup process completed at $(Get-Date)" -ForegroundColor Cyan
