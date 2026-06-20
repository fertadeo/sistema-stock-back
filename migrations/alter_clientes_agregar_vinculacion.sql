-- Vinculación de clientes del mismo domicilio (ej. integrantes de una familia)
-- Idempotente: se puede ejecutar más de una vez sin error.

SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'clientes'
    AND COLUMN_NAME = 'cliente_vinculado_id'
);

SET @sql_add_col = IF(
  @col_exists = 0,
  'ALTER TABLE `clientes` ADD COLUMN `cliente_vinculado_id` INT NULL DEFAULT NULL AFTER `dia_reparto`',
  'SELECT ''cliente_vinculado_id ya existe'' AS msg'
);
PREPARE stmt_add_col FROM @sql_add_col;
EXECUTE stmt_add_col;
DEALLOCATE PREPARE stmt_add_col;

SET @idx_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'clientes'
    AND INDEX_NAME = 'fk_cliente_vinculado'
);

SET @sql_add_idx = IF(
  @idx_exists = 0,
  'ALTER TABLE `clientes` ADD KEY `fk_cliente_vinculado` (`cliente_vinculado_id`)',
  'SELECT ''fk_cliente_vinculado ya existe'' AS msg'
);
PREPARE stmt_add_idx FROM @sql_add_idx;
EXECUTE stmt_add_idx;
DEALLOCATE PREPARE stmt_add_idx;

SET @fk_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'clientes'
    AND CONSTRAINT_NAME = 'fk_cliente_vinculado'
);

SET @sql_add_fk = IF(
  @fk_exists = 0,
  'ALTER TABLE `clientes` ADD CONSTRAINT `fk_cliente_vinculado` FOREIGN KEY (`cliente_vinculado_id`) REFERENCES `clientes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''fk_cliente_vinculado constraint ya existe'' AS msg'
);
PREPARE stmt_add_fk FROM @sql_add_fk;
EXECUTE stmt_add_fk;
DEALLOCATE PREPARE stmt_add_fk;
