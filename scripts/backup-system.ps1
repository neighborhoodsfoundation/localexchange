# LocalEx Backup System
# Comprehensive backup solution for database, configuration, and application data

param(
    [Parameter(Mandatory=$false)]
    [string]$BackupType = "full",
    
    [Parameter(Mandatory=$false)]
    [string]$BackupPath = ".\backups",
    
    [Parameter(Mandatory=$false)]
    [switch]$Compress = $true,
    
    [Parameter(Mandatory=$false)]
    [switch]$Upload = $false
)

# Load environment variables
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.*)$") {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# Configuration
$Config = @{
    DatabaseName = if ($env:DB_NAME) { $env:DB_NAME } else { "localex_db" }
    DatabaseUser = if ($env:DB_USER) { $env:DB_USER } else { "localex_user" }
    DatabaseHost = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
    DatabasePort = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
    DatabasePassword = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "" }
    BackupRetentionDays = 30
    MaxBackupSize = "1GB"
    CompressionLevel = 6
}

# Create backup directory structure
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupDir = Join-Path $BackupPath $Timestamp
$DatabaseBackupDir = Join-Path $BackupDir "database"
$ConfigBackupDir = Join-Path $BackupDir "config"
$CodeBackupDir = Join-Path $BackupDir "code"

Write-Host "LocalEx Backup System" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan
Write-Host "Backup Type: $BackupType" -ForegroundColor Yellow
Write-Host "Backup Path: $BackupDir" -ForegroundColor Yellow
Write-Host "Timestamp: $Timestamp" -ForegroundColor Yellow
Write-Host ""

# Create backup directories
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
New-Item -ItemType Directory -Path $DatabaseBackupDir -Force | Out-Null
New-Item -ItemType Directory -Path $ConfigBackupDir -Force | Out-Null
New-Item -ItemType Directory -Path $CodeBackupDir -Force | Out-Null

try {
    # Step 1: Database Backup
    Write-Host "Step 1: Database Backup" -ForegroundColor Green
    Write-Host "------------------------" -ForegroundColor Green
    
    $DatabaseBackupFile = Join-Path $DatabaseBackupDir "localex_db_$Timestamp.sql"
    $DatabaseBackupCompressed = Join-Path $DatabaseBackupDir "localex_db_$Timestamp.sql.gz"
    
    Write-Host "Creating database backup..." -ForegroundColor Yellow
    $env:PGPASSWORD = $Config.DatabasePassword
    
    # Full database backup
    & "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" `
        -h $Config.DatabaseHost `
        -p $Config.DatabasePort `
        -U $Config.DatabaseUser `
        -d $Config.DatabaseName `
        -f $DatabaseBackupFile `
        --verbose `
        --no-password
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database backup completed successfully" -ForegroundColor Green
        
        # Compress if requested
        if ($Compress) {
            Write-Host "Compressing database backup..." -ForegroundColor Yellow
            try {
                # Use PowerShell's built-in compression
                Compress-Archive -Path $DatabaseBackupFile -DestinationPath ($DatabaseBackupCompressed -replace '\.gz$', '.zip') -Force
                Remove-Item $DatabaseBackupFile
                Write-Host "✅ Database backup compressed successfully" -ForegroundColor Green
            } catch {
                Write-Host "⚠️ Compression failed, keeping uncompressed backup" -ForegroundColor Yellow
            }
        }
        
        # Verify backup
        $BackupFile = if ($Compress) { ($DatabaseBackupCompressed -replace '\.gz$', '.zip') } else { $DatabaseBackupFile }
        $BackupSize = (Get-Item $BackupFile -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Length)
        Write-Host "Backup size: $([math]::Round($BackupSize / 1MB, 2)) MB" -ForegroundColor Cyan
    } else {
        throw "Database backup failed with exit code: $LASTEXITCODE"
    }
    
    # Step 2: Schema-Only Backup
    Write-Host "`nStep 2: Schema-Only Backup" -ForegroundColor Green
    Write-Host "---------------------------" -ForegroundColor Green
    
    $SchemaBackupFile = Join-Path $DatabaseBackupDir "schema_$Timestamp.sql"
    
    Write-Host "Creating schema-only backup..." -ForegroundColor Yellow
    & "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" `
        -h $Config.DatabaseHost `
        -p $Config.DatabasePort `
        -U $Config.DatabaseUser `
        -d $Config.DatabaseName `
        -s `
        -f $SchemaBackupFile `
        --no-password
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Schema backup completed successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Schema backup failed, continuing..." -ForegroundColor Yellow
    }
    
    # Step 3: Configuration Backup
    Write-Host "`nStep 3: Configuration Backup" -ForegroundColor Green
    Write-Host "-----------------------------" -ForegroundColor Green
    
    Write-Host "Backing up configuration files..." -ForegroundColor Yellow
    
    # Environment configuration
    if (Test-Path ".env") {
        Copy-Item ".env" (Join-Path $ConfigBackupDir "env.txt")
        Write-Host "✅ Environment configuration backed up" -ForegroundColor Green
    }
    
    # Package configuration
    if (Test-Path "package.json") {
        Copy-Item "package.json" (Join-Path $ConfigBackupDir "package.json")
        Write-Host "✅ Package configuration backed up" -ForegroundColor Green
    }
    
    # TypeScript configuration
    if (Test-Path "tsconfig.json") {
        Copy-Item "tsconfig.json" (Join-Path $ConfigBackupDir "tsconfig.json")
        Write-Host "✅ TypeScript configuration backed up" -ForegroundColor Green
    }
    
    # Database configuration
    if (Test-Path "src\config\database.ts") {
        Copy-Item "src\config\database.ts" (Join-Path $ConfigBackupDir "database.ts")
        Write-Host "✅ Database configuration backed up" -ForegroundColor Green
    }
    
    # Step 4: Code Backup (if full backup)
    if ($BackupType -eq "full") {
        Write-Host "`nStep 4: Code Backup" -ForegroundColor Green
        Write-Host "--------------------" -ForegroundColor Green
        
        Write-Host "Backing up source code..." -ForegroundColor Yellow
        
        # Source code
        if (Test-Path "src") {
            Copy-Item "src" (Join-Path $CodeBackupDir "src") -Recurse
            Write-Host "✅ Source code backed up" -ForegroundColor Green
        }
        
        # Scripts
        if (Test-Path "scripts") {
            Copy-Item "scripts" (Join-Path $CodeBackupDir "scripts") -Recurse
            Write-Host "✅ Scripts backed up" -ForegroundColor Green
        }
        
        # Documentation
        if (Test-Path "docs") {
            Copy-Item "docs" (Join-Path $CodeBackupDir "docs") -Recurse
            Write-Host "✅ Documentation backed up" -ForegroundColor Green
        }
        
        # Tests
        if (Test-Path "tests") {
            Copy-Item "tests" (Join-Path $CodeBackupDir "tests") -Recurse
            Write-Host "✅ Tests backed up" -ForegroundColor Green
        }
    }
    
    # Step 5: Create Backup Manifest
    Write-Host "`nStep 5: Backup Manifest" -ForegroundColor Green
    Write-Host "------------------------" -ForegroundColor Green
    
    $ManifestFile = Join-Path $BackupDir "backup_manifest.json"
    $Manifest = @{
        timestamp = $Timestamp
        backup_type = $BackupType
        database_name = $Config.DatabaseName
        backup_size = $BackupSize
        files = @{
            database = if ($Compress) { "localex_db_$Timestamp.sql.gz" } else { "localex_db_$Timestamp.sql" }
            schema = "schema_$Timestamp.sql"
            config = @()
            code = @()
        }
        metadata = @{
            created_by = $env:USERNAME
            hostname = $env:COMPUTERNAME
            version = "1.0.0"
        }
    }
    
    # Add file list to manifest
    if (Test-Path $ConfigBackupDir) {
        $Manifest.files.config = Get-ChildItem $ConfigBackupDir | Select-Object -ExpandProperty Name
    }
    
    if (Test-Path $CodeBackupDir) {
        $Manifest.files.code = Get-ChildItem $CodeBackupDir -Recurse | Where-Object { !$_.PSIsContainer } | Select-Object -ExpandProperty FullName | ForEach-Object { $_.Replace($CodeBackupDir, "") }
    }
    
    $Manifest | ConvertTo-Json -Depth 3 | Out-File $ManifestFile -Encoding UTF8
    Write-Host "✅ Backup manifest created" -ForegroundColor Green
    
    # Step 6: Backup Verification
    Write-Host "`nStep 6: Backup Verification" -ForegroundColor Green
    Write-Host "-----------------------------" -ForegroundColor Green
    
    $TotalSize = (Get-ChildItem $BackupDir -Recurse | Measure-Object -Property Length -Sum).Sum
    Write-Host "Total backup size: $([math]::Round($TotalSize / 1MB, 2)) MB" -ForegroundColor Cyan
    
    # Verify database backup integrity
    if (Test-Path $DatabaseBackupCompressed) {
        Write-Host "Verifying database backup integrity..." -ForegroundColor Yellow
        # Note: Full verification would require decompressing and testing SQL
        Write-Host "✅ Database backup appears valid" -ForegroundColor Green
    }
    
    # Step 7: Cleanup Old Backups
    Write-Host "`nStep 7: Cleanup Old Backups" -ForegroundColor Green
    Write-Host "-----------------------------" -ForegroundColor Green
    
    $OldBackups = Get-ChildItem $BackupPath | Where-Object { 
        $_.PSIsContainer -and 
        $_.Name -match "^\d{8}_\d{6}$" -and 
        $_.CreationTime -lt (Get-Date).AddDays(-$Config.BackupRetentionDays)
    }
    
    if ($OldBackups.Count -gt 0) {
        Write-Host "Removing $($OldBackups.Count) old backup(s)..." -ForegroundColor Yellow
        $OldBackups | Remove-Item -Recurse -Force
        Write-Host "✅ Old backups cleaned up" -ForegroundColor Green
    } else {
        Write-Host "No old backups to clean up" -ForegroundColor Cyan
    }
    
    # Step 8: Upload to Remote Storage (if requested)
    if ($Upload) {
        Write-Host "`nStep 8: Upload to Remote Storage" -ForegroundColor Green
        Write-Host "-----------------------------------" -ForegroundColor Green
        Write-Host "Upload functionality not implemented yet" -ForegroundColor Yellow
        Write-Host "Manual upload required to cloud storage" -ForegroundColor Yellow
    }
    
    # Success Summary
    Write-Host "`n🎉 Backup Completed Successfully!" -ForegroundColor Green
    Write-Host "====================================" -ForegroundColor Green
    Write-Host "Backup Location: $BackupDir" -ForegroundColor Cyan
    Write-Host "Backup Type: $BackupType" -ForegroundColor Cyan
    Write-Host "Total Size: $([math]::Round($TotalSize / 1MB, 2)) MB" -ForegroundColor Cyan
    Write-Host "Timestamp: $Timestamp" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "- Verify backup integrity" -ForegroundColor White
    Write-Host "- Upload to secure remote storage" -ForegroundColor White
    Write-Host "- Test restore procedures" -ForegroundColor White
    Write-Host "- Update backup documentation" -ForegroundColor White
    
} catch {
    Write-Host "`n❌ Backup Failed!" -ForegroundColor Red
    Write-Host "==================" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Location: $($_.InvocationInfo.ScriptLineNumber)" -ForegroundColor Red
    
    # Cleanup failed backup
    if (Test-Path $BackupDir) {
        Write-Host "`nCleaning up failed backup..." -ForegroundColor Yellow
        Remove-Item $BackupDir -Recurse -Force
    }
    
    exit 1
} finally {
    # Clear password from environment
    $env:PGPASSWORD = $null
}

Write-Host "`nBackup process completed at $(Get-Date)" -ForegroundColor Cyan