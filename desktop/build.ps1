param([string]$SdkPath=$env:WEBVIEW2_SDK,[string]$Repository='sebastian1999-hub/digibonk')
$ErrorActionPreference='Stop'
$project=Split-Path $PSScriptRoot -Parent
$workspace=Split-Path $project -Parent
$version=(Get-Content -LiteralPath (Join-Path $project 'version.txt') -Raw).Trim()
if($version -notmatch '^\d{1,4}\.\d{1,4}\.\d{1,4}$'){throw 'version.txt debe contener una versión como 1.9.0.'}
if($Repository -and $Repository -notmatch '^[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9_.-]+$'){throw 'Repositorio inválido: usa propietario/nombre.'}
$sdk=if($SdkPath){$SdkPath}else{Join-Path $workspace '.desktop-build\webview2-1.0.4314.35'}
if(!(Test-Path "$sdk\lib\net462\Microsoft.Web.WebView2.Core.dll")){throw 'Falta el SDK Microsoft.Web.WebView2 1.0.4314.35.'}
$out=Join-Path $project "release\Digibonk-PC-$version"
$build=Join-Path $project '.build'
New-Item -ItemType Directory -Force "$out\game",$build | Out-Null
Copy-Item "$project\game\*" "$out\game" -Recurse -Force
Copy-Item "$sdk\lib\net462\Microsoft.Web.WebView2.Core.dll","$sdk\lib\net462\Microsoft.Web.WebView2.WinForms.dll","$sdk\runtimes\win-x64\native\WebView2Loader.dll" $out
Copy-Item "$sdk\LICENSE.txt" "$out\WebView2-LICENSE.txt"
Copy-Item "$sdk\NOTICE.txt" "$out\WebView2-NOTICE.txt"
$channel=Join-Path $build 'UpdateChannel.cs'
@"
using System.Reflection;
[assembly: AssemblyVersion("$version.0")]
[assembly: AssemblyFileVersion("$version.0")]
internal static class UpdateChannel { internal const string Repository="$Repository"; internal const string Version="$version"; }
"@ | Set-Content -LiteralPath $channel -Encoding UTF8
$compiler='C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
& $compiler /nologo /target:winexe /platform:x64 /win32icon:"$PSScriptRoot\digibonk.ico" /out:"$out\Digibonk.Game.exe" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:"$out\Microsoft.Web.WebView2.Core.dll" /reference:"$out\Microsoft.Web.WebView2.WinForms.dll" "$PSScriptRoot\Program.cs" $channel
if($LASTEXITCODE -ne 0){throw 'La compilación del juego ha fallado.'}
& $compiler /nologo /target:winexe /platform:x64 /win32icon:"$PSScriptRoot\digibonk.ico" /out:"$out\Digibonk.exe" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll "$PSScriptRoot\Launcher.cs" "$PSScriptRoot\UpdateCore.cs" $channel
if($LASTEXITCODE -ne 0){throw 'La compilación del lanzador ha fallado.'}
Copy-Item "$PSScriptRoot\digibonk.ico","$project\LEEME.txt","$project\CREDITOS-SPRITES.md","$project\version.txt" $out
Write-Output $out
