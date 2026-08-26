$ErrorActionPreference = 'Stop'

$workspace = (Get-Location).Path
$releaseRoot = Join-Path $workspace 'release\whale-desktop-pet-v4'
$releaseParent = Split-Path -Parent $releaseRoot

if (-not (Test-Path -LiteralPath $releaseParent)) {
  New-Item -ItemType Directory -Path $releaseParent | Out-Null
}
if (Test-Path -LiteralPath $releaseRoot) {
  throw "Release directory already exists: $releaseRoot. Remove or rename it explicitly before rebuilding."
}

function Require-File([string]$path) {
  if (-not (Test-Path -LiteralPath (Join-Path $workspace $path) -PathType Leaf)) {
    throw "Missing release source file: $path"
  }
}
function Require-Directory([string]$path) {
  if (-not (Test-Path -LiteralPath (Join-Path $workspace $path) -PathType Container)) {
    throw "Missing release source directory: $path"
  }
}
function Copy-ReleaseFile([string]$source, [string]$destination) {
  Require-File $source
  $target = Join-Path $releaseRoot $destination
  $targetParent = Split-Path -Parent $target
  if (-not (Test-Path -LiteralPath $targetParent)) { New-Item -ItemType Directory -Path $targetParent -Force | Out-Null }
  Copy-Item -LiteralPath (Join-Path $workspace $source) -Destination $target
}

New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $releaseRoot 'runtime') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $releaseRoot 'assets\idle') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $releaseRoot 'assets\movement') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $releaseRoot 'assets\actions') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $releaseRoot 'LICENSES') -Force | Out-Null

# Runtime entrypoints.
Copy-ReleaseFile 'artifacts\whale-2d-navigation\preview.html' 'preview.html'
Copy-ReleaseFile 'artifacts\whale-2d-navigation\navigation-player.js' 'navigation-player.js'
Copy-ReleaseFile 'artifacts\whale-2d-navigation\desktop-shell-ui.js' 'desktop-shell-ui.js'
Copy-ReleaseFile 'artifacts\whale-2d-navigation\desktop-shell-ui.css' 'desktop-shell-ui.css'
Copy-ReleaseFile 'artifacts\whale-see-through-idle-rig\preview-bundle.js' 'runtime\preview-bundle.js'

# The preview is intentionally rewritten to reference only this release tree.
$previewPath = Join-Path $releaseRoot 'preview.html'
$preview = Get-Content -LiteralPath $previewPath -Raw -Encoding utf8
$preview = $preview.Replace('./desktop-shell-ui.css?v=emotion-eyes-v104', './desktop-shell-ui.css?v=release-v1')
$preview = $preview.Replace('../whale-see-through-idle-rig/preview-bundle.js?v=emotion-eyes-v104', './runtime/preview-bundle.js?v=release-v1')
$preview = $preview.Replace('./navigation-player.js?v=emotion-eyes-v104', './navigation-player.js?v=release-v1')
$preview = $preview.Replace('./desktop-shell-ui.js?v=emotion-eyes-v104', './desktop-shell-ui.js?v=release-v1')
$preview = $preview.Replace('../whale-click-to-run/assets/movement/run_prepare.webm', './assets/movement/run/run_prepare.webm')
$preview = $preview.Replace('../whale-click-to-run/assets/movement/run_cycle.webm', './assets/movement/run/run_cycle.webm')
$preview = $preview.Replace('../whale-click-to-run/assets/movement/run_finish.webm', './assets/movement/run/run_finish.webm')
$preview = $preview.Replace('../whale-left-run-optimized/assets/movement/run_left_prepare.webm', './assets/movement/run-left/run_left_prepare.webm')
$preview = $preview.Replace('../whale-left-run-optimized/assets/movement/run_left_cycle.webm', './assets/movement/run-left/run_left_cycle.webm')
$preview = $preview.Replace('../whale-left-run-optimized/assets/movement/run_left_finish.webm', './assets/movement/run-left/run_left_finish.webm')
$preview = $preview.Replace('../whale-click-to-float/assets/movement/float_prepare.webm', './assets/movement/vertical/float_prepare.webm')
$preview = $preview.Replace('../whale-click-to-float/assets/movement/float_cycle.webm', './assets/movement/vertical/float_cycle.webm')
$preview = $preview.Replace('../whale-click-to-float/assets/movement/float_finish.webm', './assets/movement/vertical/float_finish.webm')
$preview = $preview.Replace('../whale-click-to-float/assets/movement/dive_prepare.webm', './assets/movement/vertical/dive_prepare.webm')
$preview = $preview.Replace('../whale-click-to-float/assets/movement/dive_cycle.webm', './assets/movement/vertical/dive_cycle.webm')
$preview = $preview.Replace('../whale-click-to-float/assets/movement/dive_finish.webm', './assets/movement/vertical/dive_finish.webm')
$actionNames = @('nod','wave','cute','point','confident','clap','curtsy','surprise','stretch')
foreach ($action in $actionNames) {
  $preview = $preview.Replace("../whale-live2d-video-actions/actions/$action/whale-jump-alpha.webm", "./assets/actions/$action.webm")
}
$preview = $preview.Replace('../whale-clean-room-action/assets/actions/clean_room.webm', './assets/actions/clean.webm')
Set-Content -LiteralPath $previewPath -Value $preview -Encoding utf8

$bundlePath = Join-Path $releaseRoot 'runtime\preview-bundle.js'
$bundle = Get-Content -LiteralPath $bundlePath -Raw -Encoding utf8
$bundle = $bundle.Replace('../../character-packs/default-whale/source/see-through-idle-rig-v2', '../assets/idle/see-through-idle-rig-v2')
Set-Content -LiteralPath $bundlePath -Value $bundle -Encoding utf8

# Default idle rig: keep the full-canvas source coordinates and manifest intact.
$idleSource = Join-Path $workspace 'character-packs\default-whale\source\see-through-idle-rig-v2'
Require-Directory 'character-packs\default-whale\source\see-through-idle-rig-v2'
Copy-Item -LiteralPath $idleSource -Destination (Join-Path $releaseRoot 'assets\idle\see-through-idle-rig-v2') -Recurse

# Only assets referenced by the current navigation preview are included.
$movementFiles = @{
  'artifacts\whale-click-to-run\assets\movement\run_prepare.webm' = 'assets\movement\run\run_prepare.webm'
  'artifacts\whale-click-to-run\assets\movement\run_cycle.webm' = 'assets\movement\run\run_cycle.webm'
  'artifacts\whale-click-to-run\assets\movement\run_finish.webm' = 'assets\movement\run\run_finish.webm'
  'artifacts\whale-left-run-optimized\assets\movement\run_left_prepare.webm' = 'assets\movement\run-left\run_left_prepare.webm'
  'artifacts\whale-left-run-optimized\assets\movement\run_left_cycle.webm' = 'assets\movement\run-left\run_left_cycle.webm'
  'artifacts\whale-left-run-optimized\assets\movement\run_left_finish.webm' = 'assets\movement\run-left\run_left_finish.webm'
  'artifacts\whale-click-to-float\assets\movement\float_prepare.webm' = 'assets\movement\vertical\float_prepare.webm'
  'artifacts\whale-click-to-float\assets\movement\float_cycle.webm' = 'assets\movement\vertical\float_cycle.webm'
  'artifacts\whale-click-to-float\assets\movement\float_finish.webm' = 'assets\movement\vertical\float_finish.webm'
  'artifacts\whale-click-to-float\assets\movement\dive_prepare.webm' = 'assets\movement\vertical\dive_prepare.webm'
  'artifacts\whale-click-to-float\assets\movement\dive_cycle.webm' = 'assets\movement\vertical\dive_cycle.webm'
  'artifacts\whale-click-to-float\assets\movement\dive_finish.webm' = 'assets\movement\vertical\dive_finish.webm'
}
foreach ($entry in $movementFiles.GetEnumerator()) { Copy-ReleaseFile $entry.Key $entry.Value }
foreach ($action in $actionNames) {
  Copy-ReleaseFile "artifacts\whale-live2d-video-actions\actions\$action\whale-jump-alpha.webm" "assets\actions\$action.webm"
}
Copy-ReleaseFile 'artifacts\whale-clean-room-action\assets\actions\clean_room.webm' 'assets\actions\clean.webm'

# Preserve attribution and the code license in the release package.
Copy-ReleaseFile 'ASSETS_LICENSE.md' 'LICENSES\ASSETS_LICENSE.md'
Copy-ReleaseFile 'character-packs\default-whale\SOURCE.md' 'LICENSES\default-whale-SOURCE.md'
Copy-ReleaseFile 'character-packs\default-whale\LICENSE' 'LICENSES\default-whale-LICENSE'
Copy-ReleaseFile 'LICENSE' 'LICENSES\LICENSE'

$notes = @'
# Whale Desktop Pet · Release v2

This directory is a curated runtime copy of the desktop-pet preview. It is
safe to distribute independently from the development workspace.

Included:

- Default transparent Live2D-like idle rig with expression controls.
- Horizontal run, left-run, float, and dive movement assets.
- The nine currently wired stationary actions plus room cleaning.
- Dialogue, offline replies, configurable OpenAI-compatible LLM settings,
  local billing UI, and the detached draggable input composer.

Excluded intentionally:

- Thinking-state rig and its source PSD/layer experiments.
- Historical action/video versions, screenshots, audit reports, and analysis.
- Authoring scripts and debug-only controls.

Open `preview.html` through the desktop host or a local static HTTP server.
The source and development directories remain unchanged in the repository.
'@
Set-Content -LiteralPath (Join-Path $releaseRoot 'RELEASE_NOTES.md') -Value $notes -Encoding utf8

$manifest = [ordered]@{
  schemaVersion = 1
  package = 'whale-desktop-pet'
  packageVersion = 'release-v4'
  entry = 'preview.html'
  builtAtUtc = [DateTime]::UtcNow.ToString('o')
  features = @('idle-live2d', 'expressions', 'movement', 'actions', 'dialogue', 'offline-replies', 'llm-settings', 'local-billing', 'draggable-composer')
  excluded = @('thinking-state', 'authoring-sources', 'historical-previews', 'debug-only-assets')
  files = @()
}
$releaseFiles = Get-ChildItem -LiteralPath $releaseRoot -Recurse -File | Where-Object { $_.Name -ne 'release-manifest.json' } | Sort-Object FullName
foreach ($file in $releaseFiles) {
  $relative = $file.FullName.Substring($releaseRoot.Length + 1).Replace('\', '/')
  $manifest.files += [ordered]@{ path = $relative; bytes = $file.Length; sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
}
$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $releaseRoot 'release-manifest.json') -Encoding utf8

$totalBytes = ($releaseFiles | Measure-Object Length -Sum).Sum
Write-Output "RELEASE_ROOT=$releaseRoot"
Write-Output "RELEASE_FILES=$($releaseFiles.Count)"
Write-Output "RELEASE_BYTES=$totalBytes"
