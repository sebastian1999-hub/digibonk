# Clasificación semanal de Digibonk

La migración `migrations/202611070003_weekly_leaderboard.sql` convierte la clasificación en semanal. Se aplica al proyecto Supabase que ya usa el juego, después de las dos migraciones anteriores de esta carpeta.

Aplicada y verificada en producción el 7 de noviembre de 2026: ocho récords históricos conservados y copiados al archivo semanal, envíos del protocolo actual aceptados en una transacción revertida, RLS activa y acceso anónimo denegado.

La semana comienza el lunes a las 00:00 en `Europe/Madrid`, incluidos los cambios de hora. No requiere una tarea programada: la consulta selecciona automáticamente la semana del reloj del servidor. Los resultados de otras semanas permanecen en `digibonk_weekly_runs`, y `digibonk_records` conserva los mejores resultados históricos. Los récords locales del PC se mantienen.

El cliente envía `finished_at` junto al resultado y lo conserva si queda pendiente sin conexión. Un envío posterior se asigna a la semana en que terminó la partida. Los clientes anteriores que no enviaban fecha se asignan a la semana de recepción. Un identificador de partida ya registrado no puede volver a entrar en otra semana ni modificar su puntuación.

La migración reutiliza las RPC `digibonk_leaderboard()` y `digibonk_submit_run(jsonb)`, mantiene el acceso privado del grupo y no cambia las tablas de Digital Ranch. Puede volver a aplicarse sin duplicar resultados.

Antes de publicar el cliente, aplica la migración en Supabase. La prueba `tests/weekly-leaderboard.test.cjs` la ejecuta en PostgreSQL con PGlite y verifica límites semanales, cambios de hora, reintentos, permisos y conservación del histórico. GitHub Actions instala ese entorno de pruebas antes de empaquetar el juego.
