-- Soft delete para ventas cerradas: anula el cierre sin borrar carga/descarga
ALTER TABLE `ventas_cerradas`
  ADD COLUMN `deleted_at` DATETIME NULL DEFAULT NULL AFTER `grupo_cierre`;

CREATE INDEX `idx_ventas_cerradas_deleted_at` ON `ventas_cerradas` (`deleted_at`);
