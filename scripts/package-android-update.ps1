$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$dist = Join-Path $projectRoot 'android/dist'
$apk = Join-Path $projectRoot 'android/app/build/outputs/apk/debug/app-debug.apk'
if (!(Test-Path -LiteralPath $apk)) { throw 'Build the Android debug APK first.' }
New-Item -ItemType Directory -Force -Path $dist | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $projectRoot 'public/downloads') | Out-Null
Copy-Item -LiteralPath $apk -Destination (Join-Path $dist 'Aryan-Gold-debug.apk') -Force
Copy-Item -LiteralPath $apk -Destination (Join-Path $projectRoot 'public/downloads/aryan-gold.apk') -Force

# Explicit allowlist: no credentials, database, uploaded documents, or build caches.
$files = @(
    'lib/android.ts', 'lib/auth.ts', 'components/admin/BillForm.tsx',
    'app/admin/(protected)/bills/[id]/page.tsx', 'app/admin/(protected)/reports/page.tsx',
    'components/admin/AdminShell.tsx', 'app/globals.css', 'public/downloads/aryan-gold.apk',
    'app/admin/login/page.tsx'
)
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPath = Join-Path $dist 'website-update.zip'
$stream = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::Create)
$archive = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($relative in $files) {
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, (Join-Path $projectRoot $relative), $relative) | Out-Null
    }
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, (Join-Path $projectRoot 'android/WEBSITE-UPDATE.md'), 'WEBSITE-UPDATE.md') | Out-Null
} finally { $archive.Dispose(); $stream.Dispose() }
$verify = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    if ($verify.Entries.Count -ne ($files.Count + 1)) { throw 'Unexpected package contents.' }
    $verify.Entries | Select-Object FullName, Length
} finally { $verify.Dispose() }
if ((Get-FileHash $apk).Hash -ne (Get-FileHash (Join-Path $projectRoot 'public/downloads/aryan-gold.apk')).Hash) {
    throw 'The website APK does not match the build.'
}
