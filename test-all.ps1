$ErrorActionPreference = "Stop"

Write-Host "=== Running Backend Tests & Lint ===" -ForegroundColor Cyan
Set-Location ikmn-backend
npm run lint
npm run test
Set-Location ..

Write-Host "=== Running Frontend Lint ===" -ForegroundColor Cyan
Set-Location ikimina-platform-frontend
npm run lint
Set-Location ..

Write-Host "=== All checks passed! ===" -ForegroundColor Green
