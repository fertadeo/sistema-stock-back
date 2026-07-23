-- Restricción de clientes por cuenta de usuario (repartidor)
-- MySQL 5.7+: ejecutar solo si la columna no existe
ALTER TABLE `user`
  ADD COLUMN `solo_clientes_propios` TINYINT(1) NOT NULL DEFAULT 0 AFTER `repartidor_id`;
