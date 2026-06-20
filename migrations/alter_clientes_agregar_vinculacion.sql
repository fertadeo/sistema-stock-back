-- Vinculación de clientes del mismo domicilio (ej. integrantes de una familia)
ALTER TABLE `clientes`
  ADD COLUMN `cliente_vinculado_id` INT NULL DEFAULT NULL AFTER `dia_reparto`,
  ADD KEY `fk_cliente_vinculado` (`cliente_vinculado_id`),
  ADD CONSTRAINT `fk_cliente_vinculado`
    FOREIGN KEY (`cliente_vinculado_id`) REFERENCES `clientes` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
