param([string]$RuntimePath)
$ErrorActionPreference='Stop'
$project=Split-Path $PSScriptRoot -Parent
if(!$RuntimePath){$version=(Get-Content "$project\version.txt" -Raw).Trim();$RuntimePath=Join-Path $project "release\Digibonk-PC-$version"}
$build=Join-Path $project '.build'
New-Item -ItemType Directory -Force $build | Out-Null
$testExe=Join-Path $build 'UpdaterTests.exe'
& 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe' /nologo /target:exe /out:$testExe /reference:System.Web.Extensions.dll /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll "$project\tests\UpdaterTests.cs" "$PSScriptRoot\UpdateCore.cs"
if($LASTEXITCODE -ne 0){throw 'No se pudo compilar la prueba del actualizador.'}
$testRoot=Join-Path $build ('updater-test-'+[Guid]::NewGuid().ToString('N'))
& $testExe $testRoot $RuntimePath
if($LASTEXITCODE -ne 0){throw 'Fallaron las pruebas del actualizador.'}
