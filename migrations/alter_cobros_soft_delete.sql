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

-- Crear índice si no existe (MySQL no soporta CREATE INDEX IF NOT EXISTS)
SET @dbname = DATABASE();
SET @tablename = 'cobros';
SET @indexname = 'idx_cobros_activo';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND INDEX_NAME = @indexname
  ) > 0,
  'SELECT 1',
  'CREATE INDEX `idx_cobros_activo` ON `cobros` (`activo`)'
));
PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;
