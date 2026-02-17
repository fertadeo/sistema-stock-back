-- Tabla para registrar visitas donde el repartidor no encontró al cliente
CREATE TABLE IF NOT EXISTS `visitas_no_encontradas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cliente_id` int(11) NOT NULL,
  `repartidor_id` int(11) DEFAULT NULL,
  `observaciones` varchar(500) NOT NULL DEFAULT 'Cliente no encontrado en la visita',
  `fecha_registro` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_visita` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `cliente_id` (`cliente_id`),
  KEY `repartidor_id` (`repartidor_id`),
  KEY `idx_visitas_fecha` (`fecha_registro`),
  CONSTRAINT `visitas_no_encontradas_cliente_fk` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `visitas_no_encontradas_repartidor_fk` FOREIGN KEY (`repartidor_id`) REFERENCES `repartidores` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
