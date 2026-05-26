-- Agrega un tipo específico para cobros de clientes en la auditoría.
-- Evita mezclar cobros con ventas en métricas y dashboards.
-- Ejecutar en producción: mysql -u usuario -p base_datos < alter_movimientos_agregar_cobro_cliente.sql

ALTER TABLE `movimientos`
MODIFY COLUMN `tipo` ENUM(
  'VENTA_LOCAL',
  'COBRO_CLIENTE',
  'GASTO',
  'NUEVO_CLIENTE',
  'NUEVO_PRODUCTO',
  'MODIFICACION_PRODUCTO',
  'MODIFICACION_CLIENTE',
  'CIERRE_VENTA',
  'RENDICION'
) NOT NULL;
