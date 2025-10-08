# LocalEx Repository Sync Script
# This script ensures local and GitHub repos stay synchronized

Write-Host "🔄 Syncing LocalEx Repository..." -ForegroundColor Cyan

# Check current status
Write-Host "`n📊 Checking repository status..." -ForegroundColor Yellow
git status --short

# Fetch latest changes from GitHub
Write-Host "`n⬇️ Fetching latest changes from GitHub..." -ForegroundColor Yellow
git fetch origin

# Check if we're behind remote
$behind = git rev-list --count HEAD..origin/master
if ($behind -gt 0) {
    Write-Host "⚠️  Local repo is $behind commits behind remote. Pulling changes..." -ForegroundColor Red
    git pull origin master
} else {
    Write-Host "✅ Local repo is up to date with remote" -ForegroundColor Green
}

# Check for uncommitted changes
$uncommitted = git status --porcelain
if ($uncommitted) {
    Write-Host "`n📝 Uncommitted changes detected:" -ForegroundColor Yellow
    git status --short
    Write-Host "`n💡 Use 'git add .' and 'git commit -m \"message\"' to commit changes" -ForegroundColor Cyan
    Write-Host "💡 Then use 'git push origin master' to sync to GitHub" -ForegroundColor Cyan
} else {
    Write-Host "✅ No uncommitted changes" -ForegroundColor Green
    
    # Push any local commits to GitHub
    $ahead = git rev-list --count origin/master..HEAD
    if ($ahead -gt 0) {
        Write-Host "`n⬆️ Local repo is $ahead commits ahead. Pushing to GitHub..." -ForegroundColor Yellow
        git push origin master
    }
}

Write-Host "`n🎉 Sync check complete!" -ForegroundColor Green
Write-Host "📍 Repository: https://github.com/neighborhoodsfoundation/localexchange.git" -ForegroundColor Blue
