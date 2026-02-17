-- Script SQL para crear las nuevas tablas para operaciones rápidas del repartidor
-- Ejecutar este script en la base de datos para habilitar las nuevas funcionalidades

-- Tabla para registrar cobros independientes
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

-- Tabla para registrar movimientos de envases (préstamos y devoluciones)
CREATE TABLE IF NOT EXISTS `movimientos_envases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cliente_id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `producto_nombre` varchar(255) NOT NULL,
  `capacidad` decimal(10,2) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `tipo` enum('PRESTAMO','DEVOLUCION','AJUSTE') NOT NULL,
  `repartidor_id` int(11) DEFAULT NULL,
  `fecha_movimiento` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `observaciones` text DEFAULT NULL,
  `venta_relacionada_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `cliente_id` (`cliente_id`),
  KEY `producto_id` (`producto_id`),
  KEY `repartidor_id` (`repartidor_id`),
  KEY `venta_relacionada_id` (`venta_relacionada_id`),
  KEY `fecha_movimiento` (`fecha_movimiento`),
  CONSTRAINT `movimientos_envases_cliente_fk` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `movimientos_envases_producto_fk` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `movimientos_envases_repartidor_fk` FOREIGN KEY (`repartidor_id`) REFERENCES `repartidores` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
