# LocalEx GitHub Synchronization Script
# Version: 2.0
# Date: October 18, 2025
# Purpose: Comprehensive GitHub repository synchronization

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("sync", "backup", "restore", "status", "validate")]
    [string]$Action = "sync",
    
    [Parameter(Mandatory=$false)]
    [string]$CommitMessage = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$Force,
    
    [Parameter(Mandatory=$false)]
    [switch]$Verbose
)

# Configuration
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptPath
$GitConfig = @{
    Remote = "origin"
    Branch = "master"
    BackupBranch = "backup-$(Get-Date -Format 'yyyyMMdd')"
}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $LogMessage = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Message"
    Write-Host $LogMessage
    if ($Verbose) {
        Add-Content -Path (Join-Path $ProjectRoot "github-sync.log") -Value $LogMessage
    }
}

function Test-GitRepository {
    Write-Log "Checking Git repository status..."
    
    if (-not (Test-Path (Join-Path $ProjectRoot ".git"))) {
        throw "Not a Git repository. Please initialize Git first."
    }
    
    # Check Git status
    $GitStatus = git status --porcelain
    if ($GitStatus) {
        Write-Log "Uncommitted changes detected:" "WARN"
        Write-Host $GitStatus
        return $false
    }
    
    # Check if on correct branch
    $CurrentBranch = git branch --show-current
    if ($CurrentBranch -ne $GitConfig.Branch) {
        Write-Log "Current branch: $CurrentBranch, Expected: $($GitConfig.Branch)" "WARN"
        return $false
    }
    
    Write-Log "Git repository status: OK"
    return $true
}

function Test-GitHubConnection {
    Write-Log "Testing GitHub connection..."
    
    try {
        # Test remote connection
        git ls-remote origin | Out-Null
        Write-Log "GitHub connection: OK"
        return $true
    } catch {
        Write-Log "GitHub connection failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Get-RepositoryStatus {
    Write-Log "Getting repository status..."
    
    try {
        # Local status
        $LocalCommits = git rev-list --count HEAD
        $LocalBranch = git branch --show-current
        $LastCommit = git log -1 --format="%H %s %cd" --date=short
        
        # Remote status
        git fetch origin
        $RemoteCommits = git rev-list --count origin/$GitConfig.Branch
        $RemoteBranch = $GitConfig.Branch
        
        # Status comparison
        $Status = @{
            LocalCommits = $LocalCommits
            RemoteCommits = $RemoteCommits
            LocalBranch = $LocalBranch
            RemoteBranch = $RemoteBranch
            LastCommit = $LastCommit
            Behind = $RemoteCommits - $LocalCommits
            Ahead = $LocalCommits - $RemoteCommits
        }
        
        Write-Log "Repository Status:"
        Write-Log "  Local commits: $($Status.LocalCommits)"
        Write-Log "  Remote commits: $($Status.RemoteCommits)"
        Write-Log "  Behind remote: $($Status.Behind)"
        Write-Log "  Ahead of remote: $($Status.Ahead)"
        Write-Log "  Last commit: $($Status.LastCommit)"
        
        return $Status
        
    } catch {
        Write-Log "Failed to get repository status: $($_.Exception.Message)" "ERROR"
        throw
    }
}

function Sync-ToGitHub {
    Write-Log "Starting GitHub synchronization..."
    
    try {
        # Validate repository
        if (-not (Test-GitRepository)) {
            if (-not $Force) {
                throw "Repository validation failed. Use -Force to override."
            }
        }
        
        # Test GitHub connection
        if (-not (Test-GitHubConnection)) {
            throw "GitHub connection failed"
        }
        
        # Get status
        $Status = Get-RepositoryStatus
        
        # Add all changes
        Write-Log "Adding all changes..."
        git add .
        
        # Check if there are changes to commit
        $Changes = git diff --cached --name-only
        if (-not $Changes) {
            Write-Log "No changes to commit"
            return
        }
        
        # Create commit message
        if (-not $CommitMessage) {
            $CommitMessage = "Update LocalEx v7 - Production Ready - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        }
        
        # Commit changes
        Write-Log "Committing changes..."
        git commit -m $CommitMessage
        
        # Push to remote
        Write-Log "Pushing to GitHub..."
        git push origin $GitConfig.Branch
        
        Write-Log "GitHub synchronization completed successfully!"
        
        # Update status
        $NewStatus = Get-RepositoryStatus
        Write-Log "New status: $($NewStatus.LocalCommits) local, $($NewStatus.RemoteCommits) remote"
        
    } catch {
        Write-Log "GitHub synchronization failed: $($_.Exception.Message)" "ERROR"
        throw
    }
}

function Backup-ToGitHub {
    Write-Log "Creating GitHub backup..."
    
    try {
        # Create backup branch
        $BackupBranchName = $GitConfig.BackupBranch
        Write-Log "Creating backup branch: $BackupBranchName"
        
        # Create and switch to backup branch
        git checkout -b $BackupBranchName
        
        # Push backup branch
        git push origin $BackupBranchName
        
        # Switch back to main branch
        git checkout $GitConfig.Branch
        
        Write-Log "GitHub backup completed: $BackupBranchName"
        
    } catch {
        Write-Log "GitHub backup failed: $($_.Exception.Message)" "ERROR"
        throw
    }
}

function Restore-FromGitHub {
    param([string]$BranchName = $GitConfig.Branch)
    
    Write-Log "Restoring from GitHub branch: $BranchName"
    
    try {
        # Fetch latest changes
        git fetch origin
        
        # Reset to remote branch
        git reset --hard origin/$BranchName
        
        Write-Log "Restored from GitHub branch: $BranchName"
        
    } catch {
        Write-Log "GitHub restore failed: $($_.Exception.Message)" "ERROR"
        throw
    }
}

function Validate-Repository {
    Write-Log "Validating repository structure..."
    
    $ValidationResults = @{
        GitRepository = $false
        RequiredFiles = $false
        RequiredDirectories = $false
        Configuration = $false
        Documentation = $false
        Tests = $false
        Scripts = $false
    }
    
    try {
        # Check Git repository
        if (Test-Path (Join-Path $ProjectRoot ".git")) {
            $ValidationResults.GitRepository = $true
            Write-Log "✅ Git repository: OK"
        } else {
            Write-Log "❌ Git repository: Missing" "ERROR"
        }
        
        # Check required files
        $RequiredFiles = @(
            "package.json",
            "tsconfig.json",
            "jest.config.js",
            ".env.example",
            "README.md"
        )
        
        $MissingFiles = @()
        foreach ($File in $RequiredFiles) {
            if (-not (Test-Path (Join-Path $ProjectRoot $File))) {
                $MissingFiles += $File
            }
        }
        
        if ($MissingFiles.Count -eq 0) {
            $ValidationResults.RequiredFiles = $true
            Write-Log "✅ Required files: OK"
        } else {
            Write-Log "❌ Missing files: $($MissingFiles -join ', ')" "ERROR"
        }
        
        # Check required directories
        $RequiredDirs = @(
            "src",
            "docs",
            "tests",
            "scripts"
        )
        
        $MissingDirs = @()
        foreach ($Dir in $RequiredDirs) {
            if (-not (Test-Path (Join-Path $ProjectRoot $Dir))) {
                $MissingDirs += $Dir
            }
        }
        
        if ($MissingDirs.Count -eq 0) {
            $ValidationResults.RequiredDirectories = $true
            Write-Log "✅ Required directories: OK"
        } else {
            Write-Log "❌ Missing directories: $($MissingDirs -join ', ')" "ERROR"
        }
        
        # Check configuration
        $ConfigFiles = @(
            "src/config",
            "docker-compose.yml"
        )
        
        $ConfigOK = $true
        foreach ($Config in $ConfigFiles) {
            if (-not (Test-Path (Join-Path $ProjectRoot $Config))) {
                $ConfigOK = $false
                break
            }
        }
        
        if ($ConfigOK) {
            $ValidationResults.Configuration = $true
            Write-Log "✅ Configuration: OK"
        } else {
            Write-Log "❌ Configuration: Missing files" "ERROR"
        }
        
        # Check documentation
        $DocFiles = @(
            "docs/README.md",
            "docs/architecture",
            "docs/deployment"
        )
        
        $DocOK = $true
        foreach ($Doc in $DocFiles) {
            if (-not (Test-Path (Join-Path $ProjectRoot $Doc))) {
                $DocOK = $false
                break
            }
        }
        
        if ($DocOK) {
            $ValidationResults.Documentation = $true
            Write-Log "✅ Documentation: OK"
        } else {
            Write-Log "❌ Documentation: Missing files" "ERROR"
        }
        
        # Check tests
        $TestFiles = @(
            "tests/unit",
            "tests/integration",
            "tests/e2e"
        )
        
        $TestOK = $true
        foreach ($Test in $TestFiles) {
            if (-not (Test-Path (Join-Path $ProjectRoot $Test))) {
                $TestOK = $false
                break
            }
        }
        
        if ($TestOK) {
            $ValidationResults.Tests = $true
            Write-Log "✅ Tests: OK"
        } else {
            Write-Log "❌ Tests: Missing directories" "ERROR"
        }
        
        # Check scripts
        $ScriptFiles = @(
            "scripts/backup-restore-system.ps1",
            "scripts/github-sync.ps1"
        )
        
        $ScriptOK = $true
        foreach ($Script in $ScriptFiles) {
            if (-not (Test-Path (Join-Path $ProjectRoot $Script))) {
                $ScriptOK = $false
                break
            }
        }
        
        if ($ScriptOK) {
            $ValidationResults.Scripts = $true
            Write-Log "✅ Scripts: OK"
        } else {
            Write-Log "❌ Scripts: Missing files" "ERROR"
        }
        
        # Summary
        $TotalChecks = $ValidationResults.Count
        $PassedChecks = ($ValidationResults.Values | Where-Object { $_ -eq $true }).Count
        $ValidationScore = [math]::Round(($PassedChecks / $TotalChecks) * 100, 1)
        
        Write-Log "Validation Summary: $PassedChecks/$TotalChecks checks passed ($ValidationScore%)"
        
        if ($ValidationScore -ge 90) {
            Write-Log "✅ Repository validation: PASSED" "SUCCESS"
        } else {
            Write-Log "❌ Repository validation: FAILED" "ERROR"
        }
        
        return $ValidationResults
        
    } catch {
        Write-Log "Repository validation failed: $($_.Exception.Message)" "ERROR"
        throw
    }
}

function Show-RepositoryStatus {
    Write-Log "Repository Status Report"
    Write-Log "========================"
    
    try {
        # Basic status
        $Status = Get-RepositoryStatus
        
        # File count
        $TotalFiles = (Get-ChildItem -Path $ProjectRoot -Recurse -File | Where-Object { $_.Name -notlike "node_modules*" }).Count
        $SourceFiles = (Get-ChildItem -Path (Join-Path $ProjectRoot "src") -Recurse -File).Count
        $TestFiles = (Get-ChildItem -Path (Join-Path $ProjectRoot "tests") -Recurse -File).Count
        $DocFiles = (Get-ChildItem -Path (Join-Path $ProjectRoot "docs") -Recurse -File).Count
        
        Write-Log "File Statistics:"
        Write-Log "  Total files: $TotalFiles"
        Write-Log "  Source files: $SourceFiles"
        Write-Log "  Test files: $TestFiles"
        Write-Log "  Documentation files: $DocFiles"
        
        # Recent commits
        Write-Log "Recent Commits:"
        $RecentCommits = git log --oneline -5
        foreach ($Commit in $RecentCommits) {
            Write-Log "  $Commit"
        }
        
        # Branch information
        $Branches = git branch -a
        Write-Log "Available Branches:"
        foreach ($Branch in $Branches) {
            Write-Log "  $Branch"
        }
        
    } catch {
        Write-Log "Failed to get repository status: $($_.Exception.Message)" "ERROR"
        throw
    }
}

# Main execution
try {
    Write-Log "LocalEx GitHub Synchronization Script v2.0"
    Write-Log "Project Root: $ProjectRoot"
    
    switch ($Action) {
        "sync" {
            Sync-ToGitHub
        }
        "backup" {
            Backup-ToGitHub
        }
        "restore" {
            Restore-FromGitHub
        }
        "status" {
            Show-RepositoryStatus
        }
        "validate" {
            Validate-Repository
        }
    }
    
    Write-Log "Operation completed successfully!"
    
} catch {
    Write-Log "Operation failed: $($_.Exception.Message)" "ERROR"
    exit 1
}
