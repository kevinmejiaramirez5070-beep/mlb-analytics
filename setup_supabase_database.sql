-- Script SQL para crear la base de datos en Supabase (PostgreSQL)
-- Ejecuta este script en el SQL Editor de Supabase

-- Crear tabla teams
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    mlb_id INTEGER UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    abbreviation VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla games
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    mlb_id INTEGER UNIQUE NOT NULL,
    home_team_id INTEGER NOT NULL,
    away_team_id INTEGER NOT NULL,
    game_date DATE NOT NULL,
    game_time TIME,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'analyzed', 'reviewed', 'final', 'live', 'postponed', 'cancelled', 'suspended', 'scheduled', 'in progress')),
    home_score INTEGER DEFAULT NULL,
    away_score INTEGER DEFAULT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (home_team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (away_team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Crear tabla analysis
CREATE TABLE IF NOT EXISTS analysis (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL,
    home_probability NUMERIC(5,4) NOT NULL,
    away_probability NUMERIC(5,4) NOT NULL,
    home_american_odds INTEGER NOT NULL,
    away_american_odds INTEGER NOT NULL,
    level VARCHAR(20) NOT NULL CHECK (level IN ('Diamond', 'Exclusive', 'VIP', 'Low')),
    model_version VARCHAR(20) NOT NULL,
    weights_version VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Crear tabla weight_configs
CREATE TABLE IF NOT EXISTS weight_configs (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) UNIQUE NOT NULL,
    pitcher_weight NUMERIC(3,2) NOT NULL,
    batting_weight NUMERIC(3,2) NOT NULL,
    bullpen_weight NUMERIC(3,2) NOT NULL,
    defense_weight NUMERIC(3,2) NOT NULL,
    context_weight NUMERIC(3,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla backups
CREATE TABLE IF NOT EXISTS backups (
    id SERIAL PRIMARY KEY,
    backup_type VARCHAR(20) NOT NULL CHECK (backup_type IN ('daily', 'weekly', 'full')),
    backup_date DATE NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    record_count INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insertar configuración inicial de pesos
INSERT INTO weight_configs (version, pitcher_weight, batting_weight, bullpen_weight, defense_weight, context_weight, is_active) 
VALUES ('3.0', 0.35, 0.30, 0.25, 0.10, 0.00, true)
ON CONFLICT (version) DO UPDATE 
SET 
    pitcher_weight = EXCLUDED.pitcher_weight,
    batting_weight = EXCLUDED.batting_weight,
    bullpen_weight = EXCLUDED.bullpen_weight,
    defense_weight = EXCLUDED.defense_weight,
    context_weight = EXCLUDED.context_weight,
    is_active = EXCLUDED.is_active;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_games_mlb_id ON games(mlb_id);
CREATE INDEX IF NOT EXISTS idx_games_game_date ON games(game_date);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_analysis_game_id ON analysis(game_id);
CREATE INDEX IF NOT EXISTS idx_teams_mlb_id ON teams(mlb_id);

-- Verificar que todo se creó correctamente
SELECT 'teams' as tabla, COUNT(*) as registros FROM teams
UNION ALL
SELECT 'games', COUNT(*) FROM games
UNION ALL
SELECT 'analysis', COUNT(*) FROM analysis
UNION ALL
SELECT 'weight_configs', COUNT(*) FROM weight_configs
UNION ALL
SELECT 'backups', COUNT(*) FROM backups;

-- Verificar configuración de pesos
SELECT * FROM weight_configs;

