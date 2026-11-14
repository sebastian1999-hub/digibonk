# Pasivas de huevo — revisión local

Implementación local del 13 de noviembre de 2026. No publicada; sin push, tags, releases ni cambios en el servidor.

## Resultado

Las doce pasivas dependen del huevo y se mantienen al evolucionar. Los estilos evolutivos conservan las habilidades activas de Q y dejan de conceder sus antiguas pasivas. La selección de huevos muestra la descripción del huevo seleccionado, además de la ayuda y Equipo.

| Huevo | Comportamiento |
| --- | --- |
| Choromon | Una carga inicial y una por evolución; se acumulan. Una renovación de las tres tarjetas por subida. |
| Zurumon | Único huevo con gacha. Éxito = 20 % + 30 % × clamp((nivel−1)/399, 0, 1). Un intento; legendarios directos. |
| Pabumon | Un rebote por evolución, acumulable con tarjetas. Cada salto conserva el 80 % del daño anterior. |
| Petitmon | Nivel máximo 450, con oferta de mejora en el nivel 450. Otros huevos: 400. |
| Nyokimon | 0,25 % por baja. Rarezas de las cartas: 70 % común, 23 % rara, 6 % épica y 1 % legendaria. Mejoras: 1/2/3/5 %. |
| Botamon | Multiplicador crítico base ×3,6. |
| Yuramon | Nivel actual añadido al límite de enemigos. En nivel 400: 610 enemigos normales en el mundo y 550 entidades en portales, incluida la torre. Se conserva el ritmo de aparición. |
| Mokumon | Tres técnicas aleatorias de cualquier línea hasta la fase actual, más Salir. Precio existente del vendedor. Con cuatro técnicas, el cobro ocurre al aceptar el reemplazo; cancelar es gratis. |
| Pichimon | Duplica unidades por evolución; cada tres unidades forman un recolector evolucionado. Sin un límite nuevo. |
| Poyomon | Un proyectil adicional por evolución, acumulable con tarjetas. |
| Punimon | Con una técnica: estadística sin el extra + 25 % de su bonificación acumulada durante la run. Incluye las mejoras permanentes de reliquias y el daño crítico de Lente crítica. Excluye proyectiles, rebotes y recolectores. |
| YukimiBotamon | Rueda a 2,4 vueltas/s inicialmente y 1,8 en nivel 400. La primera pulsación selecciona el sector mostrado. Recompensa y posición quedan guardadas. |

Las fases se cuentan desde Bebé I: 0/1/2/3/4/5 incrementos hasta Mega. Pabumon y Poyomon reciben los incrementos correspondientes si se empieza en una fase avanzada.

Nyokimon sortea entre estadísticas con margen de mejora y valor positivo. Daño, vida, cadencia, área, velocidad, experiencia, alcance y regeneración se incrementan porcentualmente. Crítico y proporción de escudo reciben puntos porcentuales. La recogida muestra el atributo y el porcentaje; conserva las cartas al guardar y las recoge también al completar un portal.

La rueda utiliza pesos 65/28/7/2, normalizados entre las rarezas disponibles; conserva la ligera mejora de los cofres de portal (factores 1/1,12/1,2/1,25). Sus sectores no crecen con Amuleto de fortuna: mantienen común como el mayor y legendario como el menor. El amuleto conserva su funcionamiento en los cofres aleatorios. Esto evita que acumular suerte convierta toda la rueda en legendaria.

## Crítico y guardados

El guardado conserva la probabilidad crítica permanente sin recortarla. El combate aplica como máximo 85 % y obtiene el daño crítico extra como `max(0, probabilidad_permanente − 0,85)`. Un excedente de cinco puntos suma 0,05 al multiplicador. Los efectos temporales de probabilidad no generan excedente.

Especialista guarda por separado las bonificaciones y el extra aplicado; quita ese extra antes de incorporar una mejora o evolucionar y vuelve a calcularlo al cambiar de equipo. La evolución escala también las bonificaciones guardadas de daño y vida. Bajar la vida máxima limita la vida actual; reactivar la pasiva no cura gratuitamente.

Los guardados antiguos conservan sus estadísticas. Como no contenían un historial de tarjetas, las bonificaciones antiguas de Punimon no se pueden separar con exactitud de su base: el registro de Especialista comienza con las nuevas mejoras tras esta actualización. Los recolectores de un guardado antiguo de Pichimon tampoco se duplican retroactivamente: la duplicación empieza en su siguiente evolución. Las ofertas guardadas de Mokumon conservan sus técnicas y precios. Para revisar todo el balance de las nuevas pasivas, iniciar una run nueva.

## Arte y comprobación visual

Añadidos doce iconos de pasivas y cuatro cartas de rareza, en SVG de píxeles con fondo transparente. Reutilizados los dos PNG de recolectores. La prueba visual carga correctamente los 18 recursos.

Vista aislada: `game/passives-preview.html`, servida con `node preview-server.cjs` en `http://127.0.0.1:4173/passives-preview.html`. No conecta una cuenta ni modifica la partida. Permite comprobar la rueda, su resultado tras recargar y la renovación de Choromon.

Comprobado en navegador: rueda visible con sectores diferenciados; Detener concede una recompensa; recargar conserva esa recompensa; renovar consume la carga y desactiva el botón. También comprobada la carga del menú principal y la selección de huevos.

## Pruebas

194 pruebas automáticas aprobadas, incluidas quince pruebas nuevas de pasivas. Cubren exclusividad del gacha, cargas, evolución, fusión, nivel 450, conversión crítica, Especialista, compras canceladas/aceptadas, rueda guardada, recursos, límites reales de enemigos y determinismo tras guardar una horda.

Se mantienen las pruebas previas de cofres gratuitos, probabilidades de portales, escudo, elección de técnicas, entrada/salida de portales, controles, rebotes, recolectores, mapa y acumulación de reliquias.

Medición reproducible con `node tests/egg-passives-performance.cjs` (150 actualizaciones por escenario; simulación sin renderizado):

| Escenario | Media | Percentil 95 |
| --- | ---: | ---: |
| Yuramon, 610 enemigos en mundo | 7,73 ms | 10,32 ms |
| Yuramon, 550 entidades en portal | 7,64 ms | 9,44 ms |
| Pichimon, 128 unidades / 44 recolectores | 0,07 ms | 0,06 ms |
| Pichimon, 1.024 unidades / 342 recolectores | 0,46 ms | 0,64 ms |

Las hordas de más de 220 enemigos reparten las decisiones de ruta cada 90–162 ms; movimiento, colisiones y separación siguen actualizándose en cada fotograma. Antes de este ajuste, los dos escenarios de Yuramon rondaban 24 ms por actualización. La media incluye el coste de la primera preparación de rutas.

Pendiente de valorar jugando: FPS reales con todos los efectos y sprites, rendimiento de cantidades extremas sin límite, facilidad de detener la rueda y equilibrio de las doce pasivas en runs completas. Estas mediciones no garantizan una tasa de fotogramas concreta.
