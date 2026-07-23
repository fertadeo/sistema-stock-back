-- Campos adicionales de usuario: nombre visible, estado activo y último login
ALTER TABLE `user`
  ADD COLUMN `nombre` VARCHAR(255) NULL DEFAULT NULL AFTER `password`,
  ADD COLUMN `activo` TINYINT(1) NOT NULL DEFAULT 1 AFTER `nombre`,
  ADD COLUMN `last_login` DATETIME NULL DEFAULT NULL AFTER `repartidor_id`;

UPDATE `user` SET `activo` = 1 WHERE `activo` IS NULL;
