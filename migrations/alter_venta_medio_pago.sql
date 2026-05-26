-- Agrega 'debito' y 'credito' al ENUM medio_pago de la tabla venta.
-- Requerido para alinear la base con la entidad Venta y los flujos de repartidor rápido.
-- Ejecutar en producción: mysql -u usuario -p base_datos < alter_venta_medio_pago.sql

ALTER TABLE `venta` 
MODIFY COLUMN `medio_pago` ENUM('efectivo','transferencia','debito','credito') NOT NULL;
