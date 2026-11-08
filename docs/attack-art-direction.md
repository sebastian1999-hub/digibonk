# Dirección visual de las técnicas

Referencias consultadas el 4 de noviembre de 2026:

- [Megabonk, vídeo de jugabilidad en Steam](https://store.steampowered.com/app/3405340/Megabonk/): proyectiles pequeños pero reconocibles, estelas direccionales y golpes que conservan la lectura del terreno.
- [Soulstone Survivors, galería oficial](https://www.soulstonesurvivors.com/): núcleos luminosos dentro de masas de color más oscuras, separación entre zonas de peligro y ataques y formas propias por elemento.
- [Halls of Torment, capturas oficiales en Steam](https://store.steampowered.com/app/2218750/Halls_of_Torment/): siluetas claras, arcos cortantes y efectos espectrales reconocibles incluso entre muchos enemigos.

Estas son observaciones visuales para orientar el trabajo, no afirmaciones sobre cómo están implementados esos juegos. No se han copiado sus recursos gráficos.

## Implementación

`attack-choreography.js` dirige las 58 técnicas ofensivas y las 6 de apoyo. Sustituye la combinación de los antiguos dibujos de proyectiles, impactos, espirales cinematográficas y efectos Next Order. Las técnicas comparten primitivas, pero cada arquetipo conserva su silueta: cometa, ola, cristal, rayo ramificado, corte, misil, pétalos, vórtice, raíces, etc.

`attack-textures.js` dibuja recursos originales al cargar: cometas, cortes, gotas, destellos, ondas, sellos, humo y fracturas. Las texturas se reutilizan y los dibujos se agrupan mediante instancias. Las estelas conservan un máximo de diez muestras por proyectil. Se mantienen el presupuesto global de 4600 instancias y los controles de opacidad.

Los hechizos de pilar, lluvia y meteorito muestran preparación durante los mismos 0,4 segundos que espera el combate antes de aplicar el daño. Los demás ataques muestran un destello inicial, expansión con desaceleración y disipación. Se elimina el estallido genérico de siete esferas que antes se superponía a cada número de daño.

## Renovación 1.34.0

`attack-details.js` añade animación secundaria por elemento a las 64 técnicas. `attack-detail-textures.js` dibuja las máscaras de plasma, coronas, salpicaduras curvas, copos, crecientes, pétalos, plumas, halos, hexágonos, impactos, cruces, escudo, velocidad y luz ambiental. Se generan una vez y comparten las instancias del renderizador. Las llamaradas de plasma se deforman en el shader y la esfera solar tiene superficie animada.

Las siluetas crecen aproximadamente un 24 % y las luces mantienen la saturación bajo la exposición de la isla. La máscara de impacto acompaña al elemento, sin sustituir la forma principal: el fénix sigue teniendo alas y los murciélagos conservan su enjambre. Los adornos se reducen al alcanzar el 70 % del presupuesto de 4600 instancias. La opacidad del jugador y de los enemigos se aplica por separado. Las áreas de daño y los relojes de combate no cambian.

La galería conserva las estelas entre sus seis vistas y las limpia al retroceder el reloj. La auditoría recorre todas las técnicas y añade una escena de carga con 180 proyectiles y 60 impactos. Las pruebas comprueban también la reutilización de materiales tras el calentamiento, opacidad fraccionaria, retroceso temporal y ramificación de rayos verticales.

## Revisar

Ejecutar `node preview-server.cjs` desde el repositorio y abrir `http://127.0.0.1:4173/attack-preview.html`. Permite revisar las 64 técnicas por familia, proyectil e impacto, cámara lenta, fotograma e instante fijo, sobre fondo de isla u oscuro. No lee ni modifica partidas guardadas. Usa la iluminación y el tone mapping del juego, y el mismo `AttackVisuals` de producción.

Las pruebas cubren cada técnica en siete instantes por separado, geometría y opacidad finitas, presupuesto, ausencia de mutaciones del combate, aislamiento del azar, desaparición al terminar y sincronización del daño de área. La galería sirve para la revisión visual; esas pruebas no sustituyen la evaluación estética.
