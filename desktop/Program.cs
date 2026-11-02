using System;
using System.IO;
using System.Reflection;
using System.Diagnostics;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
[assembly: AssemblyTitle("Digibonk")]
[assembly: AssemblyProduct("Digibonk")]
class DigibonkWindow : Form {
 WebView2 web=new WebView2();bool closing;string profile,report;
 const string Origin="https://appassets.digibonk.invalid";
 [STAThread] static void Main(string[] args){Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);Application.Run(new DigibonkWindow(args));}
 DigibonkWindow(string[] args){Text="Digibonk · "+UpdateChannel.Version;Icon=System.Drawing.Icon.ExtractAssociatedIcon(Application.ExecutablePath);Width=1440;Height=900;MinimumSize=new System.Drawing.Size(1000,650);WindowState=FormWindowState.Maximized;profile=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Digibonk","UserData");foreach(string arg in args){if(arg.StartsWith("--data-dir="))profile=arg.Substring(11);if(arg.StartsWith("--smoke-test="))report=arg.Substring(13);}web.Dock=DockStyle.Fill;Controls.Add(web);Shown+=async delegate{await Start();};Deactivate+=async delegate{await SavePause(true);};Activated+=async delegate{await SavePause(false);};FormClosing+=async delegate(object sender,FormClosingEventArgs e){if(closing||web.CoreWebView2==null)return;e.Cancel=true;closing=true;await SavePause(true);Close();};}
 async System.Threading.Tasks.Task SavePause(bool paused){if(web.CoreWebView2==null)return;try{await web.ExecuteScriptAsync("window.DigibonkDesktopHidden="+(paused?"true":"false")+";window.dispatchEvent(new Event('digibonk-save'));"+(paused?"window.dispatchEvent(new Event('blur'));":""));}catch{}}
 async System.Threading.Tasks.Task Start(){try{var env=await CoreWebView2Environment.CreateAsync(null,profile);await web.EnsureCoreWebView2Async(env);var core=web.CoreWebView2;core.Settings.AreDevToolsEnabled=false;core.Settings.IsStatusBarEnabled=false;core.Settings.AreDefaultContextMenusEnabled=false;core.SetVirtualHostNameToFolderMapping("appassets.digibonk.invalid",Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"game"),CoreWebView2HostResourceAccessKind.DenyCors);core.NavigationStarting+=delegate(object sender,CoreWebView2NavigationStartingEventArgs e){if(!e.Uri.StartsWith(Origin+"/",StringComparison.OrdinalIgnoreCase))e.Cancel=true;};core.NewWindowRequested+=delegate(object sender,CoreWebView2NewWindowRequestedEventArgs e){e.Handled=true;Uri u;if(Uri.TryCreate(e.Uri,UriKind.Absolute,out u)&&u.Scheme=="https")Process.Start(e.Uri);};web.KeyDown+=delegate(object sender,KeyEventArgs e){if(e.KeyCode==Keys.F11){e.Handled=true;bool full=FormBorderStyle!=FormBorderStyle.None;FormBorderStyle=full?FormBorderStyle.None:FormBorderStyle.Sizable;WindowState=FormWindowState.Maximized;}};
  await core.AddScriptToExecuteOnDocumentCreatedAsync("window.appErrors=[];window.addEventListener('error',e=>appErrors.push(e.message));window.addEventListener('unhandledrejection',e=>appErrors.push(String(e.reason))); ");
  if(report!=null){core.NavigationCompleted+=async delegate{await System.Threading.Tasks.Task.Delay(7000);await web.ExecuteScriptAsync("window.chrome.webview.postMessage({url:location.href,title:document.title,secure:isSecureContext,renderer:document.body.dataset.renderer,eggs:document.querySelectorAll('.egg-card').length,cloudStatus:document.querySelector('#cloud-status').textContent,loginReady:!document.querySelector('#login-submit').disabled,errorVisible:!document.querySelector('#fatal-error').hidden,errors:window.appErrors||[]})");};core.WebMessageReceived+=delegate(object sender,CoreWebView2WebMessageReceivedEventArgs e){File.WriteAllText(report,e.WebMessageAsJson);closing=true;Close();};}core.Navigate(Origin+"/index.html");
 }catch(Exception ex){if(report!=null){File.WriteAllText(report,ex.ToString());closing=true;Close();return;}MessageBox.Show("No se pudo iniciar Digibonk. Comprueba que Microsoft Edge WebView2 Runtime está instalado.\nhttps://developer.microsoft.com/microsoft-edge/webview2/\n\n"+ex.Message,"Digibonk");closing=true;Close();}}
}

