const { Pool } = require('pg');

// Configuración de la base de datos PostgreSQL (Supabase)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20, // máximo de clientes en el pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(dbConfig);

// Función para inicializar la base de datos
async function initializeDatabase() {
  try {
    // Crear tablas si no existen
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        mlb_id INTEGER UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        abbreviation VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
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
      )
    `);

    // Agregar columnas home_score y away_score si no existen
    try {
      await pool.query('ALTER TABLE games ADD COLUMN IF NOT EXISTS home_score INTEGER DEFAULT NULL');
    } catch (error) {
      // La columna ya existe, ignorar error
      console.log('ℹ️ Columna home_score ya existe o error:', error.message);
    }

    try {
      await pool.query('ALTER TABLE games ADD COLUMN IF NOT EXISTS away_score INTEGER DEFAULT NULL');
    } catch (error) {
      // La columna ya existe, ignorar error
      console.log('ℹ️ Columna away_score ya existe o error:', error.message);
    }

    await pool.query(`
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
      )
    `);

    await pool.query(`
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
      )
    `);

    // Agregar columna defense_weight si no existe
    try {
      await pool.query('ALTER TABLE weight_configs ADD COLUMN IF NOT EXISTS defense_weight NUMERIC(3,2) NOT NULL DEFAULT 0.10');
      console.log('✅ Columna defense_weight agregada');
    } catch (error) {
      console.log('ℹ️ Columna defense_weight ya existe o error:', error.message);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS backups (
        id SERIAL PRIMARY KEY,
        backup_type VARCHAR(20) NOT NULL CHECK (backup_type IN ('daily', 'weekly', 'full')),
        backup_date DATE NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        record_count INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Crear índices para mejorar el rendimiento
    try {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_games_mlb_id ON games(mlb_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_games_game_date ON games(game_date)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_games_status ON games(status)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_analysis_game_id ON analysis(game_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_teams_mlb_id ON teams(mlb_id)');
    } catch (error) {
      console.log('ℹ️ Error creando índices:', error.message);
    }

    // Insertar configuración inicial de pesos si no existe
    const result = await pool.query('SELECT * FROM weight_configs WHERE version = $1', ['3.0']);
    
    if (result.rows.length === 0) {
      // Desactivar configuración anterior si existe
      await pool.query('UPDATE weight_configs SET is_active = FALSE WHERE is_active = TRUE');
      
      // Insertar nueva configuración con pesos actualizados para el modelo de 4 factores (total 100%)
      await pool.query(
        'INSERT INTO weight_configs (version, pitcher_weight, batting_weight, bullpen_weight, defense_weight, context_weight, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        ['3.0', 0.35, 0.30, 0.25, 0.10, 0.00, true]
      );
    }

    console.log('✅ Base de datos inicializada correctamente');
  } catch (error) {
    console.error('❌ Error inicializando la base de datos:', error);
    throw error;
  }
}

// Wrapper para mantener compatibilidad con mysql2 (execute method)
pool.execute = async function(query, params) {
  const result = await pool.query(query, params);
  return [result.rows, result.fields];
};

module.exports = { pool, initializeDatabase };

