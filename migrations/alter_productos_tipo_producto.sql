-- Diferencia productos de venta al público vs insumos.
-- Los existentes quedan como venta_publico por defecto.
-- Ejecutar: mysql -u usuario -p base_datos < alter_productos_tipo_producto.sql

ALTER TABLE `productos`
ADD COLUMN `tipoProducto` ENUM('venta_publico', 'insumo') NOT NULL DEFAULT 'venta_publico'
AFTER `descripcion`;
