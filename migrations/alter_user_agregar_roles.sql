-- Roles multiusuario: repartidor, admin, superadmin
ALTER TABLE `user`
  ADD COLUMN `role` VARCHAR(20) NOT NULL DEFAULT 'admin' AFTER `nivel_usuario`,
  ADD COLUMN `repartidor_id` VARCHAR(36) NULL DEFAULT NULL AFTER `role`;

-- Usuarios existentes quedan como admin; el primero como superadmin
UPDATE `user` SET `role` = 'superadmin' WHERE `id` = 1;
