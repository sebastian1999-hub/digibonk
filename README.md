# Digibonk

Juego para Windows de supervivencia y digievoluciones. Elige un huevo, recoge experiencia, combina técnicas y compañeros, y cierra los seis portales destruyendo sus Torres Negras. Después te espera Devimon. La partida continúa para superar tu récord.

## Jugar

Descarga el ZIP **Digibonk-PC** desde [la última versión](https://github.com/sebastian1999-hub/digibonk/releases/latest), extrae **todos** sus archivos y abre **Digibonk.exe**. Se necesita Windows de 64 bits con WebView2 Runtime.

Desde la versión 1.9.0, ese ejecutable es el lanzador: comprueba las versiones publicadas y descarga una actualización antes de abrir el juego. Si no hay conexión o falla una comprobación, abre la versión instalada. **Digibonk.Game.exe** abre directamente el juego incluido y omite las actualizaciones.

Las partidas, las preferencias y la sesión se mantienen en `%LOCALAPPDATA%\Digibonk\UserData`. El actualizador usa otra carpeta, `%LOCALAPPDATA%\Digibonk\Updates`. Conserva la misma cuenta autorizada de Supabase y sus récords.

## Incubadora y digievolución

En la incubadora puedes elegir una forma por etapa y ver la línea completa hasta Mega. Cada dos mejoras del huevo desbloqueas otra opción por etapa. La selección se guarda por huevo y cuenta y se aplica a las nuevas partidas. Cambiar una etapa ajusta las siguientes a una ruta válida.

Al alcanzar los niveles 3, 6, 12, 20 y 30 digievolucionas automáticamente por la línea elegida. Las partidas guardadas conservan su línea; las antiguas continúan con una ruta válida de sus ramas desbloqueadas.

Las pasivas funcionan sin tener que detenerte: Vanguardia reduce el daño, Cazador gana velocidad y marca al enemigo cercano, Guardián regenera vida, Controlador ralentiza a los enemigos cercanos, Artillería aumenta el alcance y Marea evita la ralentización del agua.

## Técnicas y objetos

El catálogo **Técnicas y objetos** muestra las 64 técnicas por familia y etapa y las 28 reliquias, incluidos cinco legendarios únicos. Las técnicas se eligen al subir de nivel, según la forma actual. Puedes llevar cuatro y elegir qué sustituir al aprender una nueva; también puedes conservar las actuales. Las técnicas heredadas siguen funcionando al digievolucionar.

Hay 6 cofres en la isla y 2 por portal. El primero cuesta 100 bits y los siguientes 190, 310, 460… El precio aumenta con cada apertura y se conserva al guardar y cruzar portales. Los enemigos normales y élites tienen un 0,1 % de probabilidad de soltar un cofre; solo los invasores tienen el cofre garantizado. Los cofres caídos duran 60 segundos y usan el mismo precio. Radar de tesoros y Antena de botín aumentan ligeramente la probabilidad normal, hasta un 0,325 % al combinar ambos en rango 3.

Wizardmon solo permite quitar técnicas gratis. Las técnicas nuevas aparecen al subir de nivel si hay un hueco libre. Las tarjetas, el equipo y la barra de técnicas indican su fase evolutiva y una descripción breve del tipo de ataque.

Desde el minuto 15, la dificultad recibe un multiplicador adicional que se duplica cada 2 minutos. Aumentan también la velocidad de los enemigos, sus proyectiles y su cadencia. El límite de enemigos simultáneos se mantiene para conservar el rendimiento.

Al completar un portal, su corrupción permanece visible durante la caída de la torre. El regreso espera a que la transición cubra la pantalla y genera enemigos nuevos en la isla; un Devimon activo conserva su vida.

## Estados elementales

Las técnicas pueden aplicar estados sobre enemigos. El catálogo **Técnicas y objetos → Estados** explica los once tipos; el catálogo de estados muestra probabilidades y duración; al elegir una técnica ves un resumen breve de su efecto y recarga. El daño periódico no hace críticos ni acumula cargas del mismo estado. Empapado potencia una descarga eléctrica y después desaparece. Los controles tienen una recuperación compartida para evitar bloqueos continuos; los jefes resisten esos controles y las torres son inmunes. Los iconos sobre los Digimon enemigos muestran los estados activos y el tiempo restante.

## Presión y portales

Dispones de 3 minutos de partida para entrar en un portal. Entrar suspende el plazo; salir sin cerrarlo reanuda el tiempo que quedaba. Al destruir la Torre Negra comienza un nuevo plazo de 3 minutos. Si llegas tarde, los enemigos reciben al menos el doble de vida y un 50 % más de daño, y la penalización aumenta mientras sigas esperando. Un portal abierto tarde conserva esa corrupción al volver.

La dificultad general acelera con los minutos transcurridos, también dentro de los portales y después de vencer a Devimon. Cerrar portales no reinicia el tiempo global. Los enemigos presentes también se ajustan manteniendo su porcentaje de vida restante. Los menús, la pausa y las cargas detienen el reloj. Las partidas anteriores a esta actualización reciben un primer plazo de 3 minutos al continuar.

## Controles

| Acción                          | Predeterminado                           |
| ------------------------------- | ---------------------------------------- |
| Movimiento                      | WASD o flechas; también clic en el suelo |
| Esquivar                        | Espacio                                  |
| Interactuar / cofres / portales | E                                        |
| Habilidad de evolución          | Q                                        |
| Pausa                           | Esc o P                                  |
| Pantalla completa               | F11                                      |

Hay 40 técnicas, con efectos propios de agua, fuego, hielo, electricidad, luz, oscuridad, naturaleza y armas mecánicas. Algunas formas, como WarGreymon y MetalGreymon, tienen técnicas características distintas.

En **Ajustes** puedes cambiar dos teclas por acción y regular la opacidad de ataques, experiencia y proyectiles enemigos. La barra bajo el personaje muestra cuándo vuelve a estar disponible la habilidad. Cofres: una recompensa o cerrar sin elegir. Hasta tres compañeros distintos activos. El minimapa utiliza iconos: amplíalo con ⛶ para consultar toda la leyenda. Wizardmon permite quitar técnicas gratis. Los portales ajustan su presión al nivel y tiempo acumulado al entrar; entrar tarde no congela enemigos débiles.

En **Ajustes → Tamaño de la interfaz** puedes elegir una escala del 70 % al 130 %. Se aplica al momento y se guarda en el PC; el escenario conserva su tamaño. Las tarjetas se ajustan a la ventana para seguir viéndose completas.

La clasificación del grupo es semanal: conserva la mejor partida de cada jugador y comienza de nuevo cada lunes a las 00:00, hora de Madrid. El servidor mantiene el histórico de semanas anteriores y los récords locales se conservan.

## Desarrollo y publicación

El código del juego está en `game/`; el lanzador y la aplicación Windows, en `desktop/`. Las comprobaciones se ejecutan con `node --test tests/*.test.cjs`.

Lee [ACTUALIZACIONES.md](ACTUALIZACIONES.md) para publicar una nueva versión. `version.txt` es la única fuente de versión para los ejecutables y paquetes. Una etiqueta `vX.Y.Z` activa GitHub Actions: pruebas, compilación, pruebas del actualizador y publicación de los ZIP.

Este repositorio no contiene cuentas, contraseñas ni claves administrativas. La configuración del cliente contiene únicamente la URL y clave pública de Supabase; el acceso a datos depende de Auth y las reglas del servidor.

Proyecto fan sin finalidad comercial. Los personajes y recursos mantienen sus derechos originales. Consulta [los créditos](CREDITOS-SPRITES.md).

Durante la partida, Tabulador abre o cierra el menú de equipo y pausa la acción: objetos y compañeros, sprite del Digimon, dispositivo de técnicas y estadísticas. El dispositivo muestra los emblemas de las cuatro técnicas equipadas; selecciona uno para consultar su etapa, rango y descripción. Las 64 técnicas tienen tarjetas ilustradas en el catálogo y en las elecciones. Las mejoras de estadísticas tienen marcos verdes, cian, magenta o amarillos según su rareza. Los objetos ya no se acumulan en el lateral de la pantalla.
