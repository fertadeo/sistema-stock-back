-- Crear tabla para pagos de repartidores hacia la empresa
-- Los repartidores pueden deber a la empresa por ventas fiadas y hacer pagos parciales

CREATE TABLE IF NOT EXISTS `pagos_repartidor` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `repartidor_id` INT NOT NULL,
  `repartidor_nombre` VARCHAR(255) NULL,
  `monto` DECIMAL(10, 2) NOT NULL,
  `medio_pago` ENUM('efectivo', 'transferencia', 'debito', 'credito') NOT NULL DEFAULT 'efectivo',
  `observaciones` TEXT NULL,
  `usuario_registro_id` INT NULL,
  `fecha_pago` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pagos_repartidor_id` (`repartidor_id`),
  KEY `idx_pagos_fecha` (`fecha_pago`),
  KEY `idx_pagos_usuario` (`usuario_registro_id`),
  CONSTRAINT `fk_pago_repartidor` FOREIGN KEY (`repartidor_id`) REFERENCES `repartidores` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_pago_usuario` FOREIGN KEY (`usuario_registro_id`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Pagos de repartidores hacia la empresa';
