-- Script SQL para crear la tabla de operaciones pendientes (modo offline)
-- Ejecutar este script en la base de datos para habilitar la sincronización offline

CREATE TABLE IF NOT EXISTS `operaciones_pendientes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `operacion_id` varchar(255) NOT NULL,
  `tipo` enum('VENTA_RAPIDA','COBRO_RAPIDO','FIADO_RAPIDO','MOVIMIENTO_ENVASE') NOT NULL,
  `datos_operacion` json NOT NULL,
  `estado` enum('PENDIENTE','SINCRONIZADO','ERROR','DUPLICADO') NOT NULL DEFAULT 'PENDIENTE',
  `repartidor_id` int(11) DEFAULT NULL,
  `dispositivo_id` varchar(255) DEFAULT NULL,
  `fecha_operacion_local` timestamp NULL DEFAULT NULL,
  `error_mensaje` text DEFAULT NULL,
  `resultado_id` varchar(255) DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `intentos_sincronizacion` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `operacion_id` (`operacion_id`),
  KEY `repartidor_id` (`repartidor_id`),
  KEY `dispositivo_id` (`dispositivo_id`),
  KEY `estado` (`estado`),
  KEY `fecha_creacion` (`fecha_creacion`),
  KEY `idx_operaciones_repartidor_estado` (`repartidor_id`, `estado`),
  KEY `idx_operaciones_dispositivo_estado` (`dispositivo_id`, `estado`),
  CONSTRAINT `operaciones_pendientes_repartidor_fk` FOREIGN KEY (`repartidor_id`) REFERENCES `repartidores` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
