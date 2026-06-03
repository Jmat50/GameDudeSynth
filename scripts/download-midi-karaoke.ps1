# Bulk download MIDI files from midi-karaoke.info (robots.txt compliant).
# Usage: powershell -ExecutionPolicy Bypass -File scripts/download-midi-karaoke.ps1
# Optional: -SkipCrawl to only download from existing discovered-midi-urls.txt

param(
    [switch]$SkipCrawl
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$OutDir = Join-Path $RepoRoot 'MIDIDLTEST'
$SeedsFile = Join-Path $PSScriptRoot 'midi-karaoke-seeds.txt'
$UrlList = Join-Path $OutDir 'discovered-midi-urls.txt'
$LogCsv = Join-Path $OutDir 'download-log.csv'
$FailedList = Join-Path $OutDir 'failed-urls.txt'
$Katana = Join-Path $env:USERPROFILE 'go\bin\katana.exe'
$BaseHost = 'www.midi-karaoke.info'
$RequestDelaySec = 1

function Test-RobotsAllowedUrl {
    param([string]$Url)
    if ($Url -match '/cgi/|/cgi-bin/') { return $false }
    return $true
}

function Get-SanitizedFileName {
    param([string]$Name)
    $invalid = [IO.Path]::GetInvalidFileNameChars() -join ''
    $pattern = "[{0}]" -f [Regex]::Escape($invalid)
    $clean = [Regex]::Replace($Name.Trim(), $pattern, '_')
    if (-not $clean.EndsWith('.mid', [StringComparison]::OrdinalIgnoreCase)) {
        $clean += '.mid'
    }
    return $clean
}

function Get-UniqueFilePath {
    param(
        [string]$Directory,
        [string]$BaseName
    )
    $path = Join-Path $Directory $BaseName
    if (-not (Test-Path -LiteralPath $path)) { return $path }
    $stem = [IO.Path]::GetFileNameWithoutExtension($BaseName)
    $ext = [IO.Path]::GetExtension($BaseName)
    $n = 2
    while ($true) {
        $candidate = Join-Path $Directory ("{0} ({1}){2}" -f $stem, $n, $ext)
        if (-not (Test-Path -LiteralPath $candidate)) { return $candidate }
        $n++
    }
}

function Test-ValidMidiFile {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return $false }
    $bytes = [byte[]]::new(4)
    $fs = [IO.File]::OpenRead($Path)
    try {
        $read = $fs.Read($bytes, 0, 4)
        if ($read -lt 4) { return $false }
        return ($bytes[0] -eq 0x4D -and $bytes[1] -eq 0x54 -and $bytes[2] -eq 0x68 -and $bytes[3] -eq 0x64)
    }
    finally {
        $fs.Dispose()
    }
}

function Get-HumanNameFromHtml {
    param([string]$Html)
    if ($Html -match '<title>\s*MIDI Music Collection\s*-\s*(.+?)\s*</title>') {
        return $Matches[1].Trim()
    }
    if ($Html -match 'Path:\s*/[^/]+/([^<\r\n]+\.mid)') {
        return $Matches[1].Trim()
    }
    return $null
}

function Get-CompletedUrlsFromLog {
    if (-not (Test-Path -LiteralPath $LogCsv)) { return @{} }
    $map = @{}
    Import-Csv -LiteralPath $LogCsv | ForEach-Object {
        if ($_.status -eq 'ok' -and $_.url) {
            $map[$_.url] = $_.saved_name
        }
    }
    return $map
}

function Add-LogRow {
    param(
        [string]$Url,
        [string]$SavedName,
        [long]$Bytes,
        [string]$Status
    )
    $row = [PSCustomObject]@{
        url        = $Url
        saved_name = $SavedName
        bytes      = $Bytes
        status     = $Status
        timestamp  = (Get-Date -Format 'o')
    }
    if (-not (Test-Path -LiteralPath $LogCsv)) {
        $row | Export-Csv -LiteralPath $LogCsv -NoTypeInformation -Encoding UTF8
    }
    else {
        $row | Export-Csv -LiteralPath $LogCsv -NoTypeInformation -Encoding UTF8 -Append
    }
}

# --- Setup ---
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

if (-not (Test-Path -LiteralPath $Katana)) {
    Write-Error "katana not found at $Katana. Run: go install github.com/projectdiscovery/katana/cmd/katana@latest"
}

# --- Phase B: Katana discovery ---
if (-not $SkipCrawl) {
    Write-Host "Phase B: Crawling catalog A-Z with katana (may take hours)..."
    $katanaArgs = @(
        '-list', $SeedsFile,
        '-d', '3',
        '-kf', 'robotstxt',
        '-cos', '/cgi/',
        '-cos', '/cgi-bin/',
        '-fr', '\.ru\.html',
        '-em', 'mid',
        '-rd', '1',
        '-hrl', '3',
        '-retry', '2',
        '-timeout', '20',
        '-silent',
        '-o', $UrlList
    )
    & $Katana @katanaArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "katana exited with code $LASTEXITCODE"
    }
}

if (-not (Test-Path -LiteralPath $UrlList)) {
    Write-Error "URL list not found: $UrlList. Run without -SkipCrawl first."
}

$urls = Get-Content -LiteralPath $UrlList |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ -and ($_ -match '\.mid($|\?)') -and (Test-RobotsAllowedUrl $_) } |
    Sort-Object -Unique

Write-Host "Discovered $($urls.Count) unique .mid URLs"

# --- Phase C: Download ---
$completed = Get-CompletedUrlsFromLog
$ok = 0
$skipped = 0
$failed = 0
$total = $urls.Count
$i = 0

foreach ($midiUrl in $urls) {
    $i++
    if ($i % 50 -eq 0 -or $i -eq 1) {
        Write-Host "[$i/$total] ok=$ok skipped=$skipped failed=$failed"
    }

    if (-not (Test-RobotsAllowedUrl $midiUrl)) {
        Add-LogRow -Url $midiUrl -SavedName '' -Bytes 0 -Status 'blocked_robots'
        $failed++
        continue
    }

    if ($completed.ContainsKey($midiUrl)) {
        $existingPath = Join-Path $OutDir $completed[$midiUrl]
        if (Test-ValidMidiFile $existingPath) {
            $skipped++
            continue
        }
    }

    $uri = [Uri]$midiUrl
    if ($uri.Host -ne $BaseHost) {
        Add-LogRow -Url $midiUrl -SavedName '' -Bytes 0 -Status 'wrong_host'
        $failed++
        continue
    }

    $id = [IO.Path]::GetFileNameWithoutExtension($uri.LocalPath)
    $htmlUrl = "https://$BaseHost/$id.html"

    $humanName = $null
    try {
        $resp = Invoke-WebRequest -Uri $htmlUrl -TimeoutSec 30 -UseBasicParsing
        $humanName = Get-HumanNameFromHtml -Html $resp.Content
    }
    catch {
        Write-Warning "Metadata fetch failed for $htmlUrl : $_"
    }

    if (-not $humanName) {
        $humanName = "$id.mid"
    }

    $safeName = Get-SanitizedFileName -Name $humanName
    $destPath = Get-UniqueFilePath -Directory $OutDir -BaseName $safeName
    $destName = [IO.Path]::GetFileName($destPath)

    try {
        $curlArgs = @(
            '-fsSL',
            '--retry', '3',
            '--retry-delay', '2',
            '-o', $destPath,
            $midiUrl
        )
        if (Test-Path -LiteralPath $destPath) {
            $curlArgs = @('-C', '-') + $curlArgs
        }
        & curl.exe @curlArgs
        if ($LASTEXITCODE -ne 0) {
            throw "curl exit $LASTEXITCODE"
        }
        if (-not (Test-ValidMidiFile $destPath)) {
            Remove-Item -LiteralPath $destPath -Force -ErrorAction SilentlyContinue
            throw 'invalid MThd header'
        }
        $bytes = (Get-Item -LiteralPath $destPath).Length
        Add-LogRow -Url $midiUrl -SavedName $destName -Bytes $bytes -Status 'ok'
        $completed[$midiUrl] = $destName
        $ok++
    }
    catch {
        Add-LogRow -Url $midiUrl -SavedName $destName -Bytes 0 -Status "error: $_"
        Add-Content -LiteralPath $FailedList -Value $midiUrl -Encoding UTF8
        $failed++
        if (Test-Path -LiteralPath $destPath) {
            Remove-Item -LiteralPath $destPath -Force -ErrorAction SilentlyContinue
        }
    }

    Start-Sleep -Seconds $RequestDelaySec
}

Write-Host ""
Write-Host "Done. ok=$ok skipped=$skipped failed=$failed total=$total"
Write-Host "Output: $OutDir"
Write-Host "Log: $LogCsv"
