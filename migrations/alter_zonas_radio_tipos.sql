-- Extiende zonas_radio para soportar radio, barrio (auto) y polígono manual
ALTER TABLE `zonas_radio`
  ADD COLUMN IF NOT EXISTS `tipo` VARCHAR(20) NOT NULL DEFAULT 'radio' AFTER `nombre`,
  ADD COLUMN IF NOT EXISTS `poligono` JSON NULL AFTER `radio_metros`,
  ADD COLUMN IF NOT EXISTS `barrio_nombre` VARCHAR(120) NULL AFTER `poligono`,
  ADD COLUMN IF NOT EXISTS `origen_limites` VARCHAR(20) NULL AFTER `barrio_nombre`;

-- radio_metros puede ser NULL para barrio/poligono (MySQL 8+; si falla, ejecutar MODIFY aparte)
-- ALTER TABLE `zonas_radio` MODIFY COLUMN `radio_metros` INT NULL;
