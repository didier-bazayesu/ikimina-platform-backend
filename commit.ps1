param (
    [Parameter(Mandatory=$false)]
    [string]$Message
)

if (-not $Message) {
    $Message = Read-Host "Enter commit message"
}

if (-not $Message) {
    Write-Host "Commit message cannot be empty. Aborting." -ForegroundColor Red
    exit 1
}

Write-Host "Adding all files..." -ForegroundColor Cyan
git add .

Write-Host "Committing changes..." -ForegroundColor Cyan
git commit -m $Message

Write-Host "Commit successful!" -ForegroundColor Green

# Uncomment the line below if you also want it to push automatically
# git push
