# Digibonk

Juego para Windows de supervivencia y digievoluciones. Elige un huevo, recoge experiencia, combina técnicas y compañeros, y cierra los seis portales destruyendo sus Torres Negras. Después te espera Devimon. La partida continúa para superar tu récord.

## Jugar

Descarga el ZIP **Digibonk-PC** desde [la última versión](https://github.com/sebastian1999-hub/digibonk/releases/latest), extrae **todos** sus archivos y abre **Digibonk.exe**. Se necesita Windows de 64 bits con WebView2 Runtime.

Desde la versión 1.9.0, ese ejecutable es el lanzador: comprueba las versiones publicadas y descarga una actualización antes de abrir el juego. Si no hay conexión o falla una comprobación, abre la versión instalada. **Digibonk.Game.exe** abre directamente el juego incluido y omite las actualizaciones.

Las partidas, las preferencias y la sesión se mantienen en `%LOCALAPPDATA%\Digibonk\UserData`. El actualizador usa otra carpeta, `%LOCALAPPDATA%\Digibonk\Updates`. Conserva la misma cuenta autorizada de Supabase y sus récords.

## Técnicas y objetos

El catálogo **Técnicas y objetos** muestra las 64 técnicas por familia y etapa y las 28 reliquias, incluidos cinco legendarios únicos. Las técnicas se eligen al subir de nivel, según la forma actual. Puedes llevar cuatro y elegir qué sustituir al aprender una nueva; también puedes conservar las actuales. Las técnicas heredadas siguen funcionando al digievolucionar.

Los cofres cuestan 15 bits y revelan una recompensa mediante un carrusel. Su calidad puede ser común, rara, épica o legendaria. Puedes recogerla o arriesgarla una vez: 60 % de cambiarla por otra de mayor calidad y 40 % de perderla. Las probabilidades disponibles se muestran en pantalla. Los legendarios ocupan un hueco de reliquia y no se duplican; se mantienen cuatro huecos y tres compañeros. Las mejoras pagadas en la tienda usan el mismo carrusel, mantienen el atributo elegido y tienen tres calidades; no se devuelven los bits al perderlas.

## Controles

| Acción | Predeterminado |
| --- | --- |
| Movimiento | WASD o flechas; también clic en el suelo |
| Esquivar | Espacio |
| Interactuar / cofres / portales | E |
| Habilidad de evolución | Q |
| Pausa | Esc o P |
| Pantalla completa | F11 |

Hay 40 técnicas, con efectos propios de agua, fuego, hielo, electricidad, luz, oscuridad, naturaleza y armas mecánicas. Algunas formas, como WarGreymon y MetalGreymon, tienen técnicas características distintas.

En **Ajustes** puedes cambiar dos teclas por acción y regular la opacidad de ataques, experiencia y proyectiles enemigos. La barra bajo el personaje muestra cuándo vuelve a estar disponible la habilidad. Cofres: una recompensa o cerrar sin elegir. Hasta tres compañeros distintos activos. El minimapa utiliza iconos: amplíalo con ⛶ para consultar toda la leyenda. La tienda siempre ofrece tres mejoras de atributos y encarece todos sus puestos con cada compra. Los portales ajustan su presión al nivel y tiempo acumulado al entrar; entrar tarde no congela enemigos débiles.

## Desarrollo y publicación

El código del juego está en `game/`; el lanzador y la aplicación Windows, en `desktop/`. Las comprobaciones se ejecutan con `node --test tests/*.test.cjs`.

Lee [ACTUALIZACIONES.md](ACTUALIZACIONES.md) para publicar una nueva versión. `version.txt` es la única fuente de versión para los ejecutables y paquetes. Una etiqueta `vX.Y.Z` activa GitHub Actions: pruebas, compilación, pruebas del actualizador y publicación de los ZIP.

Este repositorio no contiene cuentas, contraseñas ni claves administrativas. La configuración del cliente contiene únicamente la URL y clave pública de Supabase; el acceso a datos depende de Auth y las reglas del servidor.

Proyecto fan sin finalidad comercial. Los personajes y recursos mantienen sus derechos originales. Consulta [los créditos](CREDITOS-SPRITES.md).
