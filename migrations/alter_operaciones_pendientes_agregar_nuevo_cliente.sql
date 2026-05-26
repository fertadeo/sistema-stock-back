-- Agrega la operación NUEVO_CLIENTE al enum de operaciones pendientes.
-- Requerido para permitir alta offline de clientes y su sincronización posterior.
-- Ejecutar en producción: mysql -u usuario -p base_datos < alter_operaciones_pendientes_agregar_nuevo_cliente.sql

ALTER TABLE `operaciones_pendientes`
MODIFY COLUMN `tipo` ENUM(
  'NUEVO_CLIENTE',
  'VENTA_RAPIDA',
  'COBRO_RAPIDO',
  'FIADO_RAPIDO',
  'MOVIMIENTO_ENVASE'
) NOT NULL;
