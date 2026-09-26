-- Soft delete para cobros: permite anular cobros sin perder el registro histórico
-- Esto es idempotente y puede ejecutarse múltiples veces

-- Agregar columna activo si no existe
SET @dbname = DATABASE();
SET @tablename = 'cobros';
SET @columnname = 'activo';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  'ALTER TABLE `cobros` ADD COLUMN `activo` TINYINT(1) NOT NULL DEFAULT 1 AFTER `venta_relacionada_id`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Crear índice si no existe
CREATE INDEX IF NOT EXISTS `idx_cobros_activo` ON `cobros` (`activo`);
