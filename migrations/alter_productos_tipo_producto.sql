-- Diferencia productos de venta al público vs insumos.
-- Los existentes quedan como venta_publico por defecto.
-- Ejecutar: mysql -u usuario -p base_datos < alter_productos_tipo_producto.sql
-- Nota: el backend también aplica esta migración al iniciar (runMigrations).

ALTER TABLE `productos`
ADD COLUMN `tipoProducto` VARCHAR(32) NOT NULL DEFAULT 'venta_publico'
AFTER `descripcion`;
