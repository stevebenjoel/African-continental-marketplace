$ErrorActionPreference = "Stop"
$keyPath = "C:\Users\DELL\Documents\.pac-sm-secrets\appwrite-provisioning.key"
if (-not (Test-Path -LiteralPath $keyPath -PathType Leaf)) { throw "External Appwrite key file was not found." }
$runtimeKey = (Get-Content -LiteralPath $keyPath -Raw).Trim()
if (-not $runtimeKey) { throw "External Appwrite key file is empty." }
$env:APPWRITE_AUTH_API_KEY = $runtimeKey
$env:APPWRITE_STORAGE_API_KEY = $runtimeKey
$env:APPWRITE_DATABASE_API_KEY = $runtimeKey
try { npm run dev } finally {
  Remove-Item Env:APPWRITE_AUTH_API_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:APPWRITE_STORAGE_API_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:APPWRITE_DATABASE_API_KEY -ErrorAction SilentlyContinue
}
