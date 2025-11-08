-- SQL para configurar la nueva base de datos mlbb
USE mlbb;

-- Crear tabla teams
CREATE TABLE IF NOT EXISTS teams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    mlb_id INT UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    abbreviation VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla games
CREATE TABLE IF NOT EXISTS games (
    id INT PRIMARY KEY AUTO_INCREMENT,
    mlb_id INT UNIQUE NOT NULL,
    home_team_id INT NOT NULL,
    away_team_id INT NOT NULL,
    game_date DATE NOT NULL,
    game_time TIME,
    status ENUM('pending', 'analyzed', 'reviewed', 'final', 'live', 'postponed', 'cancelled', 'suspended', 'scheduled', 'in progress') DEFAULT 'pending',
    home_score INT DEFAULT NULL,
    away_score INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (home_team_id) REFERENCES teams(id),
    FOREIGN KEY (away_team_id) REFERENCES teams(id)
);

-- Crear tabla analysis
CREATE TABLE IF NOT EXISTS analysis (
    id INT PRIMARY KEY AUTO_INCREMENT,
    game_id INT NOT NULL,
    home_probability DECIMAL(5,4) NOT NULL,
    away_probability DECIMAL(5,4) NOT NULL,
    home_american_odds INT NOT NULL,
    away_american_odds INT NOT NULL,
    level ENUM('Diamond', 'Exclusive', 'VIP', 'Low') NOT NULL,
    model_version VARCHAR(20) NOT NULL,
    weights_version VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id)
);

-- Crear tabla weight_configs
CREATE TABLE IF NOT EXISTS weight_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    version VARCHAR(20) UNIQUE NOT NULL,
    pitcher_weight DECIMAL(3,2) NOT NULL,
    batting_weight DECIMAL(3,2) NOT NULL,
    bullpen_weight DECIMAL(3,2) NOT NULL,
    defense_weight DECIMAL(3,2) NOT NULL,
    context_weight DECIMAL(3,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla backups
CREATE TABLE IF NOT EXISTS backups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    backup_type ENUM('daily', 'weekly', 'full') NOT NULL,
    backup_date DATE NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    record_count INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar configuración inicial de pesos
INSERT INTO weight_configs (version, pitcher_weight, batting_weight, bullpen_weight, defense_weight, context_weight, is_active) 
VALUES ('3.0', 0.35, 0.30, 0.25, 0.10, 0.00, true)
ON DUPLICATE KEY UPDATE 
    pitcher_weight = VALUES(pitcher_weight),
    batting_weight = VALUES(batting_weight),
    bullpen_weight = VALUES(bullpen_weight),
    defense_weight = VALUES(defense_weight),
    context_weight = VALUES(context_weight),
    is_active = VALUES(is_active);

-- Verificar que todo se creó correctamente
SHOW TABLES;
SELECT * FROM weight_configs;



