-- Zonas circulares en el mapa para delimitar el alcance de un repartidor
CREATE TABLE IF NOT EXISTS `zonas_radio` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(120) NOT NULL,
  `latitud` DECIMAL(10, 8) NOT NULL,
  `longitud` DECIMAL(11, 8) NOT NULL,
  `radio_metros` INT NOT NULL,
  `color` VARCHAR(20) NOT NULL DEFAULT '#0d9488',
  `repartidor` VARCHAR(100) NULL DEFAULT NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `creado_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_zonas_radio_activo` (`activo`),
  KEY `idx_zonas_radio_repartidor` (`repartidor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
