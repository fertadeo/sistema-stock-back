-- Agrega 'debito' y 'credito' al ENUM medio_pago de la tabla venta
-- Requerido para registrar fiados (ventas a crédito) desde repartidor rápido
-- Ejecutar en producción: mysql -u usuario -p base_datos < alter_venta_medio_pago.sql

ALTER TABLE `venta` 
MODIFY COLUMN `medio_pago` ENUM('efectivo','transferencia') NOT NULL;
