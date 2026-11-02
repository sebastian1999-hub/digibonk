using System;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Security.Cryptography;
using System.Diagnostics;
using System.Text.RegularExpressions;
using System.Collections.Generic;
using System.Web.Script.Serialization;

// All remote downloads are confined to the configured GitHub release channel.
internal static class UpdateCore {
 internal const long MaxArchive=100L*1024*1024, MaxExpanded=300L*1024*1024;
 internal static readonly JavaScriptSerializer Json=new JavaScriptSerializer{MaxJsonLength=2*1024*1024};
 internal static Version ParseVersion(string value){
  if(value==null||!Regex.IsMatch(value,@"^v?\d{1,4}\.\d{1,4}\.\d{1,4}$"))throw new InvalidDataException("Versión inválida.");
  return new Version(value.TrimStart('v'));
 }
 internal static bool ValidRepository(string value){return value!=null&&Regex.IsMatch(value,@"^[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9_.-]+$")&&!value.EndsWith("/.")&&!value.EndsWith("/..");}
 internal static Uri AssetUri(string value,string repo,string tag){
  Uri uri;if(!ValidRepository(repo)||!Uri.TryCreate(value,UriKind.Absolute,out uri)||uri.Scheme!="https"||uri.Host!="github.com"||!uri.IsDefaultPort||uri.UserInfo!=""||uri.Query!=""||uri.Fragment!=""||!uri.AbsolutePath.StartsWith("/"+repo+"/releases/download/"+tag+"/",StringComparison.OrdinalIgnoreCase))throw new InvalidDataException("Descarga fuera del canal de Digibonk.");
  return uri;
 }
 internal static string Hash(string file){using(var input=File.OpenRead(file))using(var sha=SHA256.Create())return BitConverter.ToString(sha.ComputeHash(input)).Replace("-","").ToLowerInvariant();}
 internal static void VerifyHash(string file,string expected){if(expected==null||!Regex.IsMatch(expected,@"^[a-fA-F0-9]{64}$")||!String.Equals(Hash(file),expected,StringComparison.OrdinalIgnoreCase))throw new InvalidDataException("La descarga no coincide con su SHA-256.");}
 internal static string EntryPath(string root,string name){
  var relative=name.Replace('\\','/');if(relative.StartsWith("/")||relative.Contains(":"))throw new InvalidDataException("Ruta de archivo no permitida.");
  foreach(var part in relative.Split('/'))if(part=="."||part==".."||part.EndsWith(" ")||part.EndsWith("."))throw new InvalidDataException("Ruta de archivo no permitida.");
  var prefix=Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar)+Path.DirectorySeparatorChar;
  var full=Path.GetFullPath(Path.Combine(prefix,relative.Replace('/',Path.DirectorySeparatorChar)));
  if(!full.StartsWith(prefix,StringComparison.OrdinalIgnoreCase))throw new InvalidDataException("Archivo fuera de la actualización.");return full;
 }
 internal static void Extract(string archive,string destination){
  Directory.CreateDirectory(destination);long size=0;var seen=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
  using(var zip=ZipFile.OpenRead(archive)){
   if(zip.Entries.Count>4000)throw new InvalidDataException("Demasiados archivos.");
   foreach(var entry in zip.Entries){
    size=checked(size+entry.Length);if(size>MaxExpanded)throw new InvalidDataException("Actualización demasiado grande.");
    var name=entry.FullName.Replace('\\','/');var target=EntryPath(destination,name);
    if(!seen.Add(target))throw new InvalidDataException("Archivo duplicado.");
    if(name.EndsWith("/")){Directory.CreateDirectory(target);continue;}
    if(!name.StartsWith("game/",StringComparison.OrdinalIgnoreCase)&&Array.IndexOf(new[]{"Digibonk.Game.exe","Microsoft.Web.WebView2.Core.dll","Microsoft.Web.WebView2.WinForms.dll","WebView2Loader.dll","digibonk.ico","LEEME.txt","CREDITOS-SPRITES.md","WebView2-LICENSE.txt","WebView2-NOTICE.txt","version.txt"},name)<0)throw new InvalidDataException("Archivo inesperado en la actualización.");
    Directory.CreateDirectory(Path.GetDirectoryName(target));using(var input=entry.Open())using(var output=new FileStream(target,FileMode.CreateNew,FileAccess.Write)){var buffer=new byte[65536];long written=0;int n;while((n=input.Read(buffer,0,buffer.Length))>0){written+=n;if(written>entry.Length)throw new InvalidDataException("Tamaño de archivo inválido.");output.Write(buffer,0,n);}if(written!=entry.Length)throw new InvalidDataException("Archivo incompleto.");}
   }
  }
 }
 internal static void ValidateRuntime(string directory,Version version){
  foreach(var name in new[]{"Digibonk.Game.exe","game/index.html","game/game.js","Microsoft.Web.WebView2.Core.dll","Microsoft.Web.WebView2.WinForms.dll","WebView2Loader.dll","version.txt"})if(!File.Exists(Path.Combine(directory,name)))throw new InvalidDataException("Actualización incompleta: "+name);
  if(ParseVersion(File.ReadAllText(Path.Combine(directory,"version.txt")).Trim())!=version)throw new InvalidDataException("Versión de paquete incorrecta.");
  var executable=new Version(FileVersionInfo.GetVersionInfo(Path.Combine(directory,"Digibonk.Game.exe")).FileVersion);
  if(executable.Major!=version.Major||executable.Minor!=version.Minor||executable.Build!=version.Build)throw new InvalidDataException("Versión del ejecutable incorrecta.");
 }
 internal static string ReadPointer(string root,Version bundled){
  try{var data=Json.Deserialize<Dictionary<string,string>>(File.ReadAllText(Path.Combine(root,"current.json")));var version=ParseVersion(data["version"]);if(version<=bundled||!Regex.IsMatch(data["folder"],@"^\d+\.\d+\.\d+-[a-f0-9]{12}$"))return null;
   var directory=Path.Combine(root,"versions",data["folder"]);ValidateRuntime(directory,version);return directory;
  }catch{return null;}
 }
 internal static void Activate(string root,string directory,Version version){
  Directory.CreateDirectory(root);string target=Path.Combine(root,"current.json"),temporary=Path.Combine(root,"pointer-"+Guid.NewGuid().ToString("N")+".json");
  File.WriteAllText(temporary,Json.Serialize(new Dictionary<string,string>{{"version",version.ToString()},{"folder",Path.GetFileName(directory)}}));
  if(File.Exists(target))File.Replace(temporary,target,Path.Combine(root,"previous.json"));else File.Move(temporary,target);
 }
 internal static HttpWebRequest Request(Uri uri,int timeout){var request=(HttpWebRequest)WebRequest.Create(uri);request.UserAgent="Digibonk-Updater/1";request.Timeout=timeout;request.ReadWriteTimeout=timeout;request.AllowAutoRedirect=true;return request;}
 internal static string ReadRemote(Uri uri,int limit){
  using(var response=(HttpWebResponse)Request(uri,5000).GetResponse())using(var input=response.GetResponseStream())using(var buffer=new MemoryStream()){
   if(response.ResponseUri.Scheme!="https")throw new InvalidDataException("Se requiere HTTPS.");var block=new byte[8192];int n;while((n=input.Read(block,0,block.Length))>0){if(buffer.Length+n>limit)throw new InvalidDataException("Respuesta demasiado grande.");buffer.Write(block,0,n);}return System.Text.Encoding.UTF8.GetString(buffer.ToArray());
  }
 }
 internal static void Download(Uri uri,string file,long expectedSize,Action<int> progress){
  if(expectedSize<1||expectedSize>MaxArchive)throw new InvalidDataException("Tamaño de descarga inválido.");
  using(var response=(HttpWebResponse)Request(uri,15000).GetResponse())using(var input=response.GetResponseStream())using(var output=new FileStream(file,FileMode.CreateNew,FileAccess.Write)){
   if(response.ResponseUri.Scheme!="https")throw new InvalidDataException("Se requiere HTTPS.");long count=0;var buffer=new byte[65536];int n;while((n=input.Read(buffer,0,buffer.Length))>0){count+=n;if(count>expectedSize||count>MaxArchive)throw new InvalidDataException("Descarga demasiado grande.");output.Write(buffer,0,n);progress((int)(count*100/expectedSize));}if(count!=expectedSize)throw new InvalidDataException("Descarga incompleta.");
  }
 }
 internal static string Check(string repo,string cache,Version current,Action<string,int> status){return CheckWithTransport(repo,cache,current,status,ReadRemote,Download);}
 internal static string CheckWithTransport(string repo,string cache,Version current,Action<string,int> status,Func<Uri,int,string> read,Action<Uri,string,long,Action<int>> download){
  if(!ValidRepository(repo))return null;ServicePointManager.SecurityProtocol|=SecurityProtocolType.Tls12;
  var release=Json.Deserialize<Dictionary<string,object>>(read(new Uri("https://api.github.com/repos/"+repo+"/releases/latest"),2*1024*1024));
  var tag=(string)release["tag_name"];var version=ParseVersion(tag);if(version<=current||Convert.ToBoolean(release["draft"])||Convert.ToBoolean(release["prerelease"]))return null;
  Dictionary<string,object> zip=null,checksum=null;foreach(Dictionary<string,object> asset in (System.Collections.IEnumerable)release["assets"]){if((string)asset["name"]=="Digibonk-update.zip")zip=asset;if((string)asset["name"]=="Digibonk-update.sha256")checksum=asset;}
  if(zip==null||checksum==null)throw new InvalidDataException("La versión publicada no incluye el paquete de actualización.");
  var expected=read(AssetUri((string)checksum["browser_download_url"],repo,tag),1024).Trim().Split(new[]{' ','\t','\r','\n'},StringSplitOptions.RemoveEmptyEntries)[0];
  if(!Regex.IsMatch(expected,@"^[a-fA-F0-9]{64}$"))throw new InvalidDataException("SHA-256 inválido.");
  Directory.CreateDirectory(Path.Combine(cache,"versions"));string folder=version+"-"+expected.ToLowerInvariant().Substring(0,12),destination=Path.Combine(cache,"versions",folder);
  if(Directory.Exists(destination)){ValidateRuntime(destination,version);Activate(cache,destination,version);return destination;}
  string archive=Path.Combine(cache,"download-"+Guid.NewGuid().ToString("N")+".zip"),stage=Path.Combine(cache,"versions","staging-"+Guid.NewGuid().ToString("N"));
  try{status("Descargando Digibonk "+version,0);download(AssetUri((string)zip["browser_download_url"],repo,tag),archive,Convert.ToInt64(zip["size"]),p=>status("Descargando Digibonk "+version,p));VerifyHash(archive,expected);status("Preparando la nueva versión…",100);Extract(archive,stage);ValidateRuntime(stage,version);Directory.Move(stage,destination);Activate(cache,destination,version);return destination;}
  finally{try{if(File.Exists(archive))File.Delete(archive);}catch{} /* Keep failed staging for diagnostics; never remove installed versions. */}
 }
}
