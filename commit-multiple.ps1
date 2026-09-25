Write-Host "Starting multi-commit process for Penalties feature..." -ForegroundColor Cyan

# 1. Commit the bug fix
Write-Host "`n[1/3] Staging bug fixes..." -ForegroundColor Yellow
git add ikimina-platform-frontend/src/pages/admin/MembersPage.tsx
git commit -m "fix(admin): correct invalid button variant in members page"
Write-Host "Fix commit successful!" -ForegroundColor Green

# 2. Commit the new feature
Write-Host "`n[2/3] Staging Penalties Page feature..." -ForegroundColor Yellow
git add ikimina-platform-frontend/src/pages/admin/PenaltiesPage.tsx
git add ikimina-platform-frontend/src/App.tsx
git commit -m "feat(admin): implement penalties dashboard with client-side aggregations"
Write-Host "Feature commit successful!" -ForegroundColor Green

# 3. Commit remaining files
Write-Host "`n[3/3] Staging remaining files..." -ForegroundColor Yellow
git add .
$status = git status --porcelain
if ($status) {
    git commit -m "docs: add AI assistant rules and guidelines"
    Write-Host "Remaining files committed!" -ForegroundColor Green
} else {
    Write-Host "No remaining files to commit." -ForegroundColor Green
}

Write-Host "`nPushing to remote repository..." -ForegroundColor Cyan
git push

Write-Host "`nAll commits completed and pushed successfully!" -ForegroundColor Cyan
