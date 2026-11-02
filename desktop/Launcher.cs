using System;
using System.IO;
using System.Drawing;
using System.Diagnostics;
using System.Windows.Forms;
using System.Threading.Tasks;
using System.Reflection;
[assembly: AssemblyTitle("Digibonk")]
[assembly: AssemblyProduct("Digibonk")]
internal class DigibonkLauncher : Form {
 readonly Label text=new Label();readonly ProgressBar progress=new ProgressBar();readonly string[] arguments;
 [STAThread] static void Main(string[] args){Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);Application.Run(new DigibonkLauncher(args));}
 DigibonkLauncher(string[] args){arguments=args;Text="Digibonk";Width=440;Height=155;FormBorderStyle=FormBorderStyle.FixedDialog;MaximizeBox=false;StartPosition=FormStartPosition.CenterScreen;BackColor=Color.FromArgb(26,58,49);ForeColor=Color.FromArgb(239,230,200);Icon=Icon.ExtractAssociatedIcon(Application.ExecutablePath);text.SetBounds(24,20,380,30);text.Text="Abriendo Digibonk…";text.Font=new Font("Segoe UI",12);progress.SetBounds(24,65,375,14);Controls.Add(text);Controls.Add(progress);Shown+=async delegate{await Start();};}
 void Status(string message,int value){if(IsDisposed||!IsHandleCreated)return;BeginInvoke((Action)delegate{text.Text=message;progress.Value=Math.Max(0,Math.Min(100,value));});}
 static string Quote(string value){return "\""+value.Replace("\"","\\\"")+"\"";}
 async Task Start(){
  var bundled=AppDomain.CurrentDomain.BaseDirectory;var cache=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Digibonk","Updates");
  bool smoke=Array.Exists(arguments,a=>a.StartsWith("--smoke-test=")),offline=Array.Exists(arguments,a=>a=="--no-update");var directory=bundled;
  try{var version=UpdateCore.ParseVersion(File.ReadAllText(Path.Combine(bundled,"version.txt")).Trim());if(!smoke){directory=UpdateCore.ReadPointer(cache,version)??bundled;var current=UpdateCore.ParseVersion(File.ReadAllText(Path.Combine(directory,"version.txt")).Trim());
    if(!offline&&UpdateChannel.Repository!=""){Status("Buscando actualizaciones…",0);try{var next=await Task.Run(()=>UpdateCore.Check(UpdateChannel.Repository,cache,current,Status));if(next!=null)directory=next;}catch(Exception error){try{Directory.CreateDirectory(cache);File.WriteAllText(Path.Combine(cache,"last-update-error.txt"),DateTime.UtcNow.ToString("o")+" "+error.Message);}catch{}Status("Abriendo la versión instalada…",100);}}
   }
   StartGame(directory);
  }catch(Exception error){try{if(directory!=bundled){StartGame(bundled);return;}}catch{}MessageBox.Show("No se pudo abrir Digibonk. Extrae el ZIP completo y vuelve a intentarlo.\n\n"+error.Message,"Digibonk");}
  finally{Close();}
 }
 void StartGame(string directory){var game=Path.Combine(directory,"Digibonk.Game.exe");if(!File.Exists(game))throw new FileNotFoundException("Falta Digibonk.Game.exe");var args=String.Join(" ",Array.ConvertAll(arguments,Quote));var process=Process.Start(new ProcessStartInfo(game,args){WorkingDirectory=directory,UseShellExecute=false});if(process==null)throw new IOException("No se pudo iniciar el juego.");if(Array.Exists(arguments,a=>a.StartsWith("--smoke-test=")))process.WaitForExit(25000);}
}
