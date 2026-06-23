CREATE TABLE IF NOT EXISTS `repartidor_ruta_paradas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `cliente_id` INT NOT NULL,
  `comentario` TEXT NULL,
  `hora_alerta` TIME NULL,
  `fecha` DATE NOT NULL,
  `alerta_enviada` TINYINT(1) NOT NULL DEFAULT 0,
  `visitado` TINYINT(1) NOT NULL DEFAULT 0,
  `orden` INT NOT NULL DEFAULT 0,
  `creado_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ruta_user_fecha` (`user_id`, `fecha`),
  KEY `idx_ruta_alerta` (`fecha`, `hora_alerta`, `alerta_enviada`),
  CONSTRAINT `fk_ruta_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `endpoint` VARCHAR(500) NOT NULL,
  `p256dh` VARCHAR(255) NOT NULL,
  `auth` VARCHAR(255) NOT NULL,
  `creado_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_push_endpoint` (`endpoint`(255)),
  KEY `idx_push_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
