-- Agregar piso y departamento a clientes
ALTER TABLE `clientes`
  ADD COLUMN `piso` VARCHAR(50) NULL DEFAULT NULL AFTER `direccion`,
  ADD COLUMN `departamento` VARCHAR(50) NULL DEFAULT NULL AFTER `piso`;
