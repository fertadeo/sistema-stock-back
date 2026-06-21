-- Script SQL específico para crear la tabla de cobros.
-- Es idempotente y puede ejecutarse aunque ya se haya corrido crear_tablas_repartidor_rapido.sql.

CREATE TABLE IF NOT EXISTS `cobros` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cliente_id` int(11) NOT NULL,
  `nombre_cliente` varchar(255) NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `medio_pago` enum('efectivo','transferencia','debito','credito') NOT NULL DEFAULT 'efectivo',
  `observaciones` text DEFAULT NULL,
  `repartidor_id` int(11) DEFAULT NULL,
  `fecha_cobro` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `venta_relacionada_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `cliente_id` (`cliente_id`),
  KEY `repartidor_id` (`repartidor_id`),
  KEY `venta_relacionada_id` (`venta_relacionada_id`),
  CONSTRAINT `cobros_cliente_fk` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cobros_repartidor_fk` FOREIGN KEY (`repartidor_id`) REFERENCES `repartidores` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
