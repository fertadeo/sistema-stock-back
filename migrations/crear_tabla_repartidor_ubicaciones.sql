-- Ubicación en vivo de repartidores (GPS desde Repartidor Rápido)
CREATE TABLE IF NOT EXISTS `repartidor_ubicaciones` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `repartidor_id` INT NOT NULL,
  `repartidor_nombre` VARCHAR(100) NOT NULL,
  `latitud` DECIMAL(10, 8) NOT NULL,
  `longitud` DECIMAL(11, 8) NOT NULL,
  `actualizado_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_repartidor_ubicacion` (`repartidor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
