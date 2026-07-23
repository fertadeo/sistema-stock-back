-- Configuración global de la cuenta (fila única id = 1)
CREATE TABLE IF NOT EXISTS `configuracion_sistema` (
  `id` INT NOT NULL,
  `repartidor_solo_clientes_propios` TINYINT(1) NOT NULL DEFAULT 0,
  `actualizado_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `configuracion_sistema` (`id`, `repartidor_solo_clientes_propios`)
SELECT 1, 0
WHERE NOT EXISTS (SELECT 1 FROM `configuracion_sistema` WHERE `id` = 1);
