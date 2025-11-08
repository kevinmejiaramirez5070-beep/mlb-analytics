USE mlb_analytics;

-- Desactivar verificación de claves foráneas temporalmente
SET FOREIGN_KEY_CHECKS = 0;

-- Limpiar todas las tablas en orden correcto (respetando foreign keys)
DELETE FROM analysis;
DELETE FROM games;
DELETE FROM teams;
DELETE FROM weight_configs;
DELETE FROM backups;

-- Reiniciar auto-increment de todas las tablas
ALTER TABLE analysis AUTO_INCREMENT = 1;
ALTER TABLE games AUTO_INCREMENT = 1;
ALTER TABLE teams AUTO_INCREMENT = 1;
ALTER TABLE weight_configs AUTO_INCREMENT = 1;
ALTER TABLE backups AUTO_INCREMENT = 1;

-- Reactivar verificación de claves foráneas
SET FOREIGN_KEY_CHECKS = 1;

-- Verificar que las tablas estén vacías
SELECT 'analysis' as tabla, COUNT(*) as registros FROM analysis
UNION ALL
SELECT 'games' as tabla, COUNT(*) as registros FROM games
UNION ALL
SELECT 'teams' as tabla, COUNT(*) as registros FROM teams
UNION ALL
SELECT 'weight_configs' as tabla, COUNT(*) as registros FROM weight_configs
UNION ALL
SELECT 'backups' as tabla, COUNT(*) as registros FROM backups;

-- Mensaje de confirmación
SELECT 'Base de datos limpiada exitosamente. Todas las tablas están vacías.' as mensaje;

