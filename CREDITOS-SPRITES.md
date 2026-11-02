# Sprites de Digimon World Championship

## Fuente y atribución

- Juego original: **Digimon World Championship**, Nintendo DS (Bandai Namco / Epics).
- Compilación de animaciones GIF compartida por **k23time**, publicación del 12 de marzo de 2016: <https://withthewill.net/threads/digimon-world-championship-sprites.15871/>.
- Archivo original enlazado por el autor: <https://app.box.com/s/6o8zo53melb4d5g3n01feco4d8f7usb3> (`DigimonWorldChampionshipSprites.zip`, 7.473.781 bytes).
- Fuente alternativa para consulta: <https://www.spriters-resource.com/ds_dsi/dwchampionship/>.
- Fuente alternativa parcial: <https://spritedatabase.net/game/1800>.

Descargado y comprobado el 27 de octubre de 2026. La descarga pública no supone una licencia abierta ni una cesión de derechos. Personajes y gráficos pertenecen a sus titulares originales; se conservan estas referencias para el prototipo fan privado.

## Biblioteca conservada

La biblioteca completa está fuera de la web, en `../sprite-library/`, con su ZIP en `../DigimonWorldChampionshipSprites.zip`.

| Categoría | Entradas |
|---|---:|
| Egg | 8 |
| Fresh | 12 |
| In-Training | 14 |
| Rookie | 38 |
| Champion | 65 |
| Ultimate | 50 |
| Mega | 37 |

Son **216 criaturas + 8 entradas de huevo**, y **8.656 GIF**. Las criaturas tienen 40 GIF cada una. Las denominaciones de acciones son la interpretación del compilador, no nombres oficiales de un formato documentado.

## Integración de esta versión

En `dist/assets/` se incluyen nueve PNG transparentes, uno por criatura, con **315 fotogramas** en total y **21 acciones** por criatura. Los PNG ocupan 82.768 bytes en total. Las criaturas son Koromon, Agumon, Greymon, Tsunomon, Gabumon, Garurumon (Vaccine), Tokomon, Patamon y Angemon.

Se han convertido los GIF a atlas PNG sin repintar ni modificar los píxeles del personaje. Las celdas de cada especie tienen dimensiones constantes y se alinean por centro inferior. El fondo transparente se conserva. Los sprites miran hacia la izquierda; el motor puede reflejarlos para que miren hacia la derecha. La duración de cada fotograma se conserva en **segundos**.

`sprites-data.js` expone `window.SPRITE_DATA`; `sprites-manifest.json` contiene el mismo catálogo legible. Cada especie contiene `sheet`, `width`, `height`, `sourcePrefix` y `actions`. Cada acción es una lista de `{x, y, w, h, duration}`.

| Acción del motor | GIF original |
|---|---:|
| idle / blink | 0 / 1 |
| walk / run | 2 / 3 |
| surprised / hit / jump | 4 / 5 / 6 |
| attack / attack2 / attack3 / attack4 | 7 / 8 / 9 / 10 |
| flee | 11 |
| sleep / eat | 13 / 14 |
| happy / angry / cheer | 28 / 29 / 30 |
| guard / train / shout | 31 / 32 / 33 |
| ko | 37 |

Las otras acciones originales permanecen en la biblioteca completa para futuras ampliaciones. El paquete no incluye una biblioteca verificada de proyectiles: los efectos de habilidades del motor son gráficos procedurales propios, no efectos extraídos del original.

## Alias de archivos originales

| Nombre del juego | Prefijo original |
|---|---|
| Koromon | m102_koromon |
| Agumon | m201_agumon |
| Greymon | m320_graymon |
| Tsunomon | m104_tunomon |
| Gabumon | m208_gabumon |
| Garurumon | m314_garurumon_va |
| Tokomon | m105_tokomon |
| Patamon | m227_patamon |
| Angemon | m308_angemon |

## Recursos originales de la versión 3

Los cinco iconos de carne, seta, recuperador, medicina y vendaje se dibujaron en SVG pixelado en dist/item-icons.js. El coliseo se dibujó con Canvas en dist/arena-scenery.js: paisaje, gradas, público, muros, campo y cristales. Estos gráficos son propios del prototipo, no recursos extraídos del juego.


## Catálogo ampliado e indicadores de estado

Versión 4 integra los 216 atlas (7.706 fotogramas, 21 acciones por especie), con carga progresiva por criatura. `dist/species-catalog.js` relaciona cada prefijo original con su nombre legible y etapa. BlueMeramon se corrige a Ultimate, según las fuentes documentadas, aunque su archivo original esté dentro de Champion.

Los nuevos indicadores de enfermedad (microbio), lesión (vendaje), enfermería y fatiga son SVG pixelados propios en `dist/status-icons.js`. Se reutilizan como imágenes en la interfaz y globos sobre los compañeros del recinto.

## Refugio 2.5D

El decorado isométrico de dist/ranch-scene.js es arte original dibujado con Canvas: proyección x/z/altura, caras iluminadas y en sombra, edificios y terreno con volumen. Reutiliza las animaciones originales de criaturas como billboards; las capas estáticas se cachean y se ordenan con los actores por profundidad.


## Cliente de cuentas

Supabase JS 2.118.0, distribuido bajo MIT. Bundle UMD alojado en dist/vendor/supabase-2.118.0.js; licencia en dist/vendor/supabase-LICENSE.txt. Fuente del paquete: https://www.npmjs.com/package/@supabase/supabase-js . No se carga el SDK desde un CDN durante el juego.


## Estadios temáticos originales
Los siete SVG de dist/assets/arenas son arte vectorial original generado por tools/generate-arena-maps.cjs. Están inspirados en las siete temáticas documentadas por Eldwick en https://www.speedrun.com/digimon_world_championship/guides/gkp1v (tabla https://www.speedrun.com/static/blob/pzmwmwwe.png), y en las capturas promocionales de selección Magma Arena y campo de pradera en https://s.pacn.ws/1/p/7a/pa.131415.4.png?v=k68v54&width=800 y https://s.pacn.ws/1/p/7a/pa.131415.5.png?v=k68v54&width=800 . Las capturas no se distribuyen ni se cargan en producción. La búsqueda en https://spritedatabase.net/game/1800 no localizó un paquete completo de fondos. La rotación y efectos de ambiente son código propio; no se han introducido recursos de otros juegos.

## Efectos de las 26 habilidades
Los efectos de skill-effects.js son dibujos originales de Canvas, sin recursos externos. Reutilizan las poses originales attack a attack4, guard, shout y cheer de los atlas ya documentados. Se incluyen efectos diferenciados de lanzamiento, recorrido e impacto/apoyo por técnica, y escudo persistente. No se han generado nuevos fotogramas de los Digimon ni se afirma que cada técnica tenga un atlas exclusivo.

## Digibonk
Esta edición reutiliza 216 atlas de Digimon y 8 atlas de huevos del proyecto Digibruto. El motor de supervivencia, interfaz y escenario 3D son propios de Digibonk. Three.js 0.187.0 se distribuye bajo licencia MIT (game/vendor/three-LICENSE.txt). No incluye cuentas ni datos de Digibruto.


## Efectos de ataques (1.11.0)
Las llamas, espuma, olas, niebla, energía y geometrías de proyectiles se han
creado para este proyecto mediante Canvas y Three.js. No son capturas de
animaciones de juegos comerciales. Los nombres se adaptan al español para
este fan game. Referencias: [WarGreymon](https://digimon.net/reference_en/detail.php?directory_name=wargreymon)
y [enciclopedia oficial](https://digimon.net/reference_en/).
