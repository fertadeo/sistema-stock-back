-- Agregar campos para envases propios (bidones y sifones que el cliente compró al iniciar)
-- Idempotente: se puede ejecutar más de una vez sin error.

SET @col_bidon_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'clientes'
    AND COLUMN_NAME = 'bidon_propio'
);

SET @sql_add_bidon = IF(
  @col_bidon_exists = 0,
  'ALTER TABLE `clientes` ADD COLUMN `bidon_propio` TINYINT(1) DEFAULT 0 COMMENT ''Indica si el cliente tiene bidón propio'' AFTER `dia_reparto`',
  'SELECT ''bidon_propio ya existe'' AS msg'
);
PREPARE stmt_add_bidon FROM @sql_add_bidon;
EXECUTE stmt_add_bidon;
DEALLOCATE PREPARE stmt_add_bidon;

SET @col_sifones_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'clientes'
    AND COLUMN_NAME = 'sifones_propios'
);

SET @sql_add_sifones = IF(
  @col_sifones_exists = 0,
  'ALTER TABLE `clientes` ADD COLUMN `sifones_propios` TINYINT(1) DEFAULT 0 COMMENT ''Indica si el cliente tiene sifones propios'' AFTER `bidon_propio`',
  'SELECT ''sifones_propios ya existe'' AS msg'
);
PREPARE stmt_add_sifones FROM @sql_add_sifones;
EXECUTE stmt_add_sifones;
DEALLOCATE PREPARE stmt_add_sifones;
