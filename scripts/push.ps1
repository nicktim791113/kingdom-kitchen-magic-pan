param(
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

git status --short

if ([string]::IsNullOrWhiteSpace($Message)) {
  $Message = "Update game $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

git add .

$staged = git diff --cached --name-only
if ([string]::IsNullOrWhiteSpace(($staged -join ""))) {
  Write-Host "No staged changes to commit."
} else {
  git commit -m $Message
}

git pull --rebase origin main
git push origin main

Write-Host "Pushed to GitHub. GitHub Pages will deploy automatically after the workflow finishes."
