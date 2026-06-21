-- Reasigna clientes y el registro de repartidor: Axel Torres → Fernando Tadeo
-- Idempotente: solo actualiza filas que aún tengan el nombre anterior.
--
-- Si DBeaver/MySQL devuelve "Too many connections":
--   1. Detené el backend (npm run dev) y cerrá pestañas extra en DBeaver
--   2. O ejecutá: npm run migrate   (usa una sola conexión y la cierra sola)
--   3. Reiniciá el servicio MySQL (XAMPP/WAMP) si persiste

UPDATE `clientes`
SET `repartidor` = 'Fernando Tadeo'
WHERE LOWER(TRIM(`repartidor`)) = 'axel torres';

UPDATE `repartidores`
SET `nombre` = 'Fernando Tadeo'
WHERE LOWER(TRIM(`nombre`)) = 'axel torres'
  AND NOT EXISTS (
    SELECT 1
    FROM (
      SELECT `id`
      FROM `repartidores`
      WHERE LOWER(TRIM(`nombre`)) = 'fernando tadeo'
    ) AS `existente`
  );
