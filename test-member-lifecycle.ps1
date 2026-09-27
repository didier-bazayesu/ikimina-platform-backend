$ErrorActionPreference = "Stop"

Write-Host "=== Running Member Lifecycle Tests ===" -ForegroundColor Cyan
Set-Location ikmn-backend
npm run test -- src/application/member/member.service.test.ts
Set-Location ..

Write-Host "=== Member Lifecycle Tests Passed! ===" -ForegroundColor Green
