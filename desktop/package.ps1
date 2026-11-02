param([string]$Repository='sebastian1999-hub/digibonk',[string]$SdkPath=$env:WEBVIEW2_SDK)
$ErrorActionPreference='Stop'
$project=Split-Path $PSScriptRoot -Parent
$version=(Get-Content -LiteralPath "$project\version.txt" -Raw).Trim()
& "$PSScriptRoot\build.ps1" -Repository $Repository -SdkPath $SdkPath
$out=Join-Path $project "release\Digibonk-PC-$version"
$portable=Join-Path $project "release\Digibonk-PC-$version.zip"
Compress-Archive -Path "$out\*" -DestinationPath $portable -Force
$payload=Get-ChildItem -LiteralPath $out | Where-Object {$_.Name -ne 'Digibonk.exe'} | Select-Object -ExpandProperty FullName
$update=Join-Path $project 'release\Digibonk-update.zip'
Compress-Archive -LiteralPath $payload -DestinationPath $update -Force
$hash=(Get-FileHash -LiteralPath $update -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  Digibonk-update.zip" | Set-Content -LiteralPath "$project\release\Digibonk-update.sha256" -Encoding ASCII
Write-Output "Paquetes listos para publicar: $version"
