param(
  [string]$WidgetDir = "widget",
  [string]$OutputPath = "dist/kommo-private-chatbot-widget.zip"
)

$ErrorActionPreference = "Stop"

$resolvedWidgetDir = Resolve-Path $WidgetDir
$resolvedOutputParent = Split-Path -Path $OutputPath -Parent

if (-not $resolvedOutputParent) {
  $resolvedOutputParent = "."
}

New-Item -ItemType Directory -Path $resolvedOutputParent -Force | Out-Null

if (Test-Path $OutputPath) {
  Remove-Item $OutputPath -Force
}

Compress-Archive -Path (Join-Path $resolvedWidgetDir "*") -DestinationPath $OutputPath -Force
Write-Output ("Widget archive created: " + $OutputPath)

