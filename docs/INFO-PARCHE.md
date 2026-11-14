# Actualizar Info parche en cada subida

La fuente única es `RELEASE-NOTES.md`. El menú muestra las versiones publicadas de más reciente a más antigua.

1. Durante el desarrollo, añadir las novedades y correcciones bajo `## Pendiente de publicación`.
2. Antes de una subida autorizada, trasladar esas entradas a `## X.Y.Z · Título del parche`, coincidiendo con `version.txt`.
3. Ejecutar `node scripts/sync-patch-notes.cjs` para actualizar la vista local y ejecutar las pruebas.
4. El empaquetado de Windows genera automáticamente el historial dentro del paquete y excluye los borradores. Si la versión nueva no tiene notas, detiene el empaquetado con un mensaje explicativo.

No editar a mano `game/patch-notes.js`: se genera desde el historial. La copia de desarrollo identifica expresamente las notas pendientes como «todavía sin publicar». El paquete oficial solo contiene versiones publicadas.

Este cambio no publica ninguna versión ni modifica los datos de cuentas o clasificación.
