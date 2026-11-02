# Publicar actualizaciones de Digibonk

Repositorio: https://github.com/sebastian1999-hub/digibonk

## Para los jugadores

Instala una vez el ZIP 1.9.0 o posterior: extrae todo y usa **Digibonk.exe**. Las versiones antiguas no incluyen actualizador. A partir de ahí, al abrir el lanzador se comprueba la última versión estable publicada. La actualización se instala antes de empezar la partida, nunca a mitad de una run.

La caché está fuera de la carpeta de partidas. Puedes jugar sin conexión. Si una actualización no se puede verificar, descargar o preparar, se conserva la versión anterior. Para omitir la comprobación, abre `Digibonk.Game.exe` del ZIP o ejecuta `Digibonk.exe --no-update`.

## Publicar desde este repositorio

1. Modifica el juego y comprueba los cambios.
2. Cambia `version.txt`, por ejemplo a `1.11.1`. Debe subir respecto a la versión publicada.
3. Escribe las novedades en `RELEASE-NOTES.md`.
4. Guarda los cambios con un commit y súbelos a `main`.
5. Crea y sube la etiqueta correspondiente:

```powershell
git add game desktop tests .github README.md ACTUALIZACIONES.md RELEASE-NOTES.md LEEME.txt PROYECTO.txt version.txt
git commit -m "Preparar Digibonk 1.11.1"
git push origin main
git tag v1.11.1
git push origin v1.11.1
```

GitHub Actions ejecutará las pruebas, descargará el SDK oficial de WebView2, compilará ambos ejecutables y publicará una Release con:

- `Digibonk-PC-X.Y.Z.zip`: distribución completa para instalar o compartir.
- `Digibonk-update.zip`: juego y recursos que descarga el lanzador.
- `Digibonk-update.sha256`: verificación del paquete.

Una subida de código por sí sola no actualiza a los jugadores: es necesario publicar la versión mediante su etiqueta. No publiques una etiqueta que ya exista. Si hay que corregir una versión, aumenta el número y crea otra.

## Compilar manualmente en Windows

Con el SDK Microsoft.Web.WebView2 1.0.4314.35 descargado:

```powershell
./desktop/package.ps1 -SdkPath C:/ruta/al/sdk -Repository sebastian1999-hub/digibonk
./desktop/test-updater.ps1
```

Los paquetes quedan en `release/`. Si se publican manualmente, adjunta los tres archivos a una Release estable cuyo tag coincida con `version.txt` y márcala como la última versión.

El lanzador sólo acepta paquetes del repositorio compilado en su canal HTTPS. Comprueba la suma SHA-256, los límites del ZIP, sus rutas, los archivos obligatorios y la versión del ejecutable antes de cambiar la versión activa. Las versiones se guardan en carpetas separadas; no se sobrescriben archivos del juego abierto.

El lanzador de esta distribución permanece estable y actualiza el juego y los recursos. Si en el futuro cambia el propio protocolo del lanzador, se distribuirá un nuevo ZIP inicial.

Referencias: [GitHub Releases API](https://docs.github.com/en/rest/releases/releases), [extracción segura de archivos ZIP en .NET](https://learn.microsoft.com/en-us/dotnet/standard/io/zip-tar-best-practices).
