Write-Host "Starting multi-commit process..." -ForegroundColor Cyan

# 1. Commit the backend restructure and modifications
Write-Host "`n[1/3] Staging backend folder restructure..." -ForegroundColor Yellow
# Add the deletions from the root folder (src, config, test scripts, etc.)
git add -u .
# Add the new ikmn-backend folder
git add ikmn-backend/
git commit -m "chore: migrate backend code into dedicated ikmn-backend workspace"
Write-Host "Backend commit successful!" -ForegroundColor Green

# 2. Commit the frontend application
Write-Host "`n[2/3] Staging frontend application..." -ForegroundColor Yellow
git add ikimina-platform-frontend/
git commit -m "feat: initialize and implement ikimina-platform-frontend React application"
Write-Host "Frontend commit successful!" -ForegroundColor Green

# 3. Commit any remaining files (like scripts, readmes, etc)
Write-Host "`n[3/3] Staging remaining files..." -ForegroundColor Yellow
git add .
$status = git status --porcelain
if ($status) {
    git commit -m "chore: add root project utility scripts"
    Write-Host "Remaining files committed!" -ForegroundColor Green
} else {
    Write-Host "No remaining files to commit." -ForegroundColor Green
}

Write-Host "`nAll commits completed successfully!" -ForegroundColor Cyan
# Uncomment below if you want to push all the new commits at once
# git push
