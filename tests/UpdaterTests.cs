using System;
using System.IO;
using System.IO.Compression;
using System.Collections.Generic;
class UpdaterTests {
 static int count;
 static void Check(bool ok,string text){if(!ok)throw new Exception(text);count++;Console.WriteLine("OK "+text);}
 static void Reject(Action action,string text){bool rejected=false;try{action();}catch{rejected=true;}Check(rejected,text);}
 static void Main(string[] args){
  var root=Path.GetFullPath(args[0]);Directory.CreateDirectory(root);var runtime=Path.GetFullPath(args[1]);var version=UpdateCore.ParseVersion(File.ReadAllText(Path.Combine(runtime,"version.txt")).Trim());
  Check(UpdateCore.ParseVersion("v1.9.0")==new Version(1,9,0),"Versiones semánticas y comparación numérica");Reject(()=>UpdateCore.ParseVersion("v1.9.0/../../"),"Rechaza etiquetas con rutas");
  Reject(()=>UpdateCore.AssetUri("https://evil.example/payload.zip","sebastian1999-hub/digibonk","v1.9.0"),"Rechaza otros servidores");
  Reject(()=>UpdateCore.AssetUri("https://github.com/otro/repo/releases/download/v1.9.0/game.zip","sebastian1999-hub/digibonk","v1.9.0"),"Rechaza otro repositorio");
  foreach(var path in new[]{"../escape.exe","game/../../escape.exe","C:/escape.exe","game/file.js:stream","game/evil. ","/escape.exe"})Reject(()=>UpdateCore.EntryPath(root,path),"Rechaza ruta peligrosa "+path);
  var bad=Path.Combine(root,"bad.zip");using(var zip=ZipFile.Open(bad,ZipArchiveMode.Create)){using(var writer=new StreamWriter(zip.CreateEntry("../escape.exe").Open()))writer.Write("bad");}Reject(()=>UpdateCore.Extract(bad,Path.Combine(root,"bad-stage")),"ZIP traversal bloqueado");Check(!File.Exists(Path.Combine(root,"escape.exe")),"No escribe fuera del área de extracción");
  var duplicate=Path.Combine(root,"duplicate.zip");using(var zip=ZipFile.Open(duplicate,ZipArchiveMode.Create)){zip.CreateEntry("game/test.js");zip.CreateEntry("game/TEST.js");}Reject(()=>UpdateCore.Extract(duplicate,Path.Combine(root,"duplicate-stage")),"Rechaza colisiones de archivos en Windows");
  var payload=Path.Combine(root,"payload.zip");using(var zip=ZipFile.Open(payload,ZipArchiveMode.Create))foreach(var path in new[]{"Digibonk.Game.exe","Microsoft.Web.WebView2.Core.dll","Microsoft.Web.WebView2.WinForms.dll","WebView2Loader.dll","version.txt","game/index.html","game/game.js"})zip.CreateEntryFromFile(Path.Combine(runtime,path),path);
  var hash=UpdateCore.Hash(payload);UpdateCore.VerifyHash(payload,hash);Check(hash.Length==64,"SHA-256 del paquete");Reject(()=>UpdateCore.VerifyHash(payload,new string('0',64)),"Rechaza un paquete alterado");
  var cache=Path.Combine(root,"cache");string checksum=hash;int downloads=0;var manifest=UpdateCore.Json.Serialize(new {tag_name="v"+version,draft=false,prerelease=false,assets=new[]{new{name="Digibonk-update.zip",size=new FileInfo(payload).Length,browser_download_url="https://github.com/sebastian1999-hub/digibonk/releases/download/v"+version+"/Digibonk-update.zip"},new{name="Digibonk-update.sha256",size=100L,browser_download_url="https://github.com/sebastian1999-hub/digibonk/releases/download/v"+version+"/Digibonk-update.sha256"}}});
  Func<Uri,int,string> read=(uri,limit)=>uri.Host=="api.github.com"?manifest:checksum+"  Digibonk-update.zip";
  Action<Uri,string,long,Action<int>> download=(uri,file,size,progress)=>{File.Copy(payload,file);downloads++;progress(100);};
  checksum=new string('0',64);Reject(()=>UpdateCore.CheckWithTransport("sebastian1999-hub/digibonk",cache,new Version(1,8,0),(t,p)=>{},read,download),"No activa una descarga con checksum incorrecto");Check(!File.Exists(Path.Combine(cache,"current.json")),"Una descarga fallida no modifica la versión activa");
  checksum=hash;var installed=UpdateCore.CheckWithTransport("sebastian1999-hub/digibonk",cache,new Version(1,8,0),(t,p)=>{},read,download);Check(Directory.Exists(installed),"Instala una nueva versión en una carpeta independiente");Check(UpdateCore.ReadPointer(cache,new Version(1,8,0))==installed,"La nueva versión queda activa y puede abrirse sin red");
  var before=downloads;Check(UpdateCore.CheckWithTransport("sebastian1999-hub/digibonk",cache,version,(t,p)=>{},read,download)==null&&downloads==before,"No descarga una versión igual o anterior");
  var pointer=File.ReadAllText(Path.Combine(cache,"current.json"));Reject(()=>UpdateCore.CheckWithTransport("sebastian1999-hub/digibonk",cache,new Version(1,8,0),(t,p)=>{},(u,l)=>{throw new IOException("Offline");},download),"Fallo de red controlable por el lanzador");Check(File.ReadAllText(Path.Combine(cache,"current.json"))==pointer,"Un fallo de red conserva la versión activa");
  Check(UpdateCore.ReadPointer(cache,new Version(9,0,0))==null,"Un juego incluido más reciente prevalece sobre la caché");
  Console.WriteLine("Pruebas del actualizador: "+count);
 }
}
