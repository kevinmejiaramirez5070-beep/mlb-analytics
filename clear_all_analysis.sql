-- SQL para limpiar todos los análisis y empezar de nuevo
-- ⚠️ ADVERTENCIA: Este script eliminará TODOS los análisis realizados

-- 1. Eliminar todos los análisis
DELETE FROM analysis;

-- 2. Eliminar todos los partidos
DELETE FROM games;

-- 3. Eliminar todos los equipos (opcional - solo si quieres empezar completamente limpio)
-- DELETE FROM teams;

-- 4. Reiniciar los contadores de auto-incremento
ALTER TABLE analysis AUTO_INCREMENT = 1;
ALTER TABLE games AUTO_INCREMENT = 1;
-- ALTER TABLE teams AUTO_INCREMENT = 1; -- Solo si eliminaste los equipos

-- 5. Verificar que las tablas estén vacías
SELECT 'Análisis restantes:' as tabla, COUNT(*) as cantidad FROM analysis
UNION ALL
SELECT 'Partidos restantes:', COUNT(*) FROM games
UNION ALL
SELECT 'Equipos restantes:', COUNT(*) FROM teams;

-- Mensaje de confirmación
SELECT '✅ Limpieza completada. Puedes empezar de nuevo con tus análisis.' as mensaje;
