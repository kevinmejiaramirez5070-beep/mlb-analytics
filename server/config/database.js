// Soporte para MySQL y PostgreSQL (Supabase)
const dbType = process.env.DB_TYPE || 'mysql';

let pool, initializeDatabase;

if (dbType === 'postgres') {
  // Configuración PostgreSQL (Supabase)
  const { Pool } = require('pg');
  
  // FORZAR uso de Connection Pooler de Supabase para Vercel
  // El pooler resuelve problemas de DNS en funciones serverless
  const dbHost = process.env.DB_HOST || 'localhost';
  
  // SIEMPRE convertir hostname de Supabase a pooler
  let finalHost = dbHost;
  let finalPort = parseInt(process.env.DB_PORT) || 5432;
  
  // Convertir automáticamente hostname de Supabase a pooler
  if (dbHost && dbHost.includes('.supabase.co')) {
    // Convertir: db.xxxxx.supabase.co -> db.xxxxx.pooler.supabase.com
    finalHost = dbHost.replace('.supabase.co', '.pooler.supabase.com');
    finalPort = 6543; // Puerto del pooler
  }
  
  console.log('='.repeat(50));
  console.log('🔍 CONFIGURACIÓN DE BASE DE DATOS:');
  console.log('   DB_HOST original:', dbHost);
  console.log('   DB_HOST final:', finalHost);
  console.log('   DB_PORT final:', finalPort);
  console.log('   DB_USER:', process.env.DB_USER);
  console.log('   DB_NAME:', process.env.DB_NAME);
  console.log('='.repeat(50));
  
  const dbConfig = {
    host: finalHost,
    port: finalPort,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  pool = new Pool(dbConfig);

  // Función para convertir parámetros de MySQL (?) a PostgreSQL ($1, $2, ...)
  function convertQueryToPostgres(query, params) {
    if (!params || params.length === 0) {
      return { query, params };
    }
    
    let paramIndex = 1;
    const convertedQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
    return { query: convertedQuery, params };
  }

  // Wrapper para mantener compatibilidad con mysql2 (execute method)
  pool.execute = async function(query, params) {
    const { query: pgQuery, params: pgParams } = convertQueryToPostgres(query, params || []);
    const result = await pool.query(pgQuery, pgParams);
    return [result.rows, result.fields];
  };

  initializeDatabase = async function() {
    try {
      // Verificar conexión primero
      await pool.query('SELECT 1');
      
      // Verificar si las tablas ya existen (para Supabase, las tablas ya están creadas)
      const checkTables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('teams', 'games', 'analysis', 'weight_configs', 'backups')
      `);
      
      const existingTables = checkTables.rows.map(row => row.table_name);
      const requiredTables = ['teams', 'games', 'analysis', 'weight_configs', 'backups'];
      const missingTables = requiredTables.filter(table => !existingTables.includes(table));
      
      // Si todas las tablas existen, solo verificar conexión y configuraciones
      if (missingTables.length === 0) {
        console.log('✅ Todas las tablas ya existen en Supabase. Verificando conexión...');
        
        // Verificar configuración de pesos inicial
        const result = await pool.query('SELECT * FROM weight_configs WHERE version = $1', ['3.0']);
        
        if (result.rows.length === 0) {
          console.log('⚠️ Configuración de pesos no encontrada. Insertando...');
          await pool.query(
            'INSERT INTO weight_configs (version, pitcher_weight, batting_weight, bullpen_weight, defense_weight, context_weight, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            ['3.0', 0.35, 0.30, 0.25, 0.10, 0.00, true]
          );
        }
        
        console.log('✅ Base de datos PostgreSQL conectada correctamente');
        return;
      }
      
      // Si faltan tablas, crearlas (solo para desarrollo local)
      console.log(`⚠️ Faltan tablas: ${missingTables.join(', ')}. Creándolas...`);
      
      // Crear tablas que faltan (código completo de creación aquí si es necesario)
      // Por ahora, solo informamos que faltan tablas
      throw new Error(`Faltan tablas en la base de datos: ${missingTables.join(', ')}. Por favor, ejecuta el script setup_supabase_database.sql en Supabase.`);
      
    } catch (error) {
      console.error('❌ Error inicializando la base de datos PostgreSQL:', error);
      throw error;
    }
  };
} else {
  // Configuración MySQL (por defecto)
  const mysql = require('mysql2/promise');
  
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mlbb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  pool = mysql.createPool(dbConfig);

  initializeDatabase = async function() {
    try {
      const connection = await pool.getConnection();
      
      // Crear tablas si no existen
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS teams (
          id INT PRIMARY KEY AUTO_INCREMENT,
          mlb_id INT UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          abbreviation VARCHAR(10) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await connection.execute(`
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
        )
      `);

      // Agregar columnas home_score y away_score si no existen
      try {
        await connection.execute('ALTER TABLE games ADD COLUMN home_score INT DEFAULT NULL');
      } catch (error) {
        // La columna ya existe, ignorar error
      }

      try {
        await connection.execute('ALTER TABLE games ADD COLUMN away_score INT DEFAULT NULL');
      } catch (error) {
        // La columna ya existe, ignorar error
      }

      // Actualizar el ENUM de status para incluir más estados
      try {
        await connection.execute(`
          ALTER TABLE games MODIFY COLUMN status 
          ENUM('pending', 'analyzed', 'reviewed', 'final', 'live', 'postponed', 'cancelled', 'suspended', 'scheduled', 'in progress') 
          DEFAULT 'pending'
        `);
      } catch (error) {
        // El ENUM ya está actualizado, ignorar error
      }

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS analysis (
          id INT PRIMARY KEY AUTO_INCREMENT,
          game_id INT NOT NULL,
          home_probability DECIMAL(5,4) NOT NULL,
          away_probability DECIMAL(5,4) NOT NULL,
          home_american_odds INT NOT NULL,
          away_american_odds INT NOT NULL,
          level ENUM('Diamond', 'Exclusive', 'VIP') NOT NULL,
          model_version VARCHAR(20) NOT NULL,
          weights_version VARCHAR(20) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (game_id) REFERENCES games(id)
        )
      `);

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS weight_configs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          version VARCHAR(20) UNIQUE NOT NULL,
          pitcher_weight DECIMAL(3,2) NOT NULL,
          batting_weight DECIMAL(3,2) NOT NULL,
          bullpen_weight DECIMAL(3,2) NOT NULL,
          context_weight DECIMAL(3,2) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Agregar columna defense_weight si no existe
      try {
        await connection.execute('ALTER TABLE weight_configs ADD COLUMN defense_weight DECIMAL(3,2) NOT NULL DEFAULT 0.10');
        console.log('✅ Columna defense_weight agregada');
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('ℹ️ Columna defense_weight ya existe');
        } else {
          console.log('ℹ️ Error agregando defense_weight:', error.message);
        }
      }

      // Eliminar columna history_weight si existe
      try {
        await connection.execute('ALTER TABLE weight_configs DROP COLUMN history_weight');
        console.log('✅ Columna history_weight eliminada');
      } catch (error) {
        if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log('ℹ️ Columna history_weight no existe');
        } else {
          console.log('ℹ️ Error eliminando history_weight:', error.message);
        }
      }

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS backups (
          id INT PRIMARY KEY AUTO_INCREMENT,
          backup_type ENUM('daily', 'weekly', 'full') NOT NULL,
          backup_date DATE NOT NULL,
          file_path VARCHAR(255) NOT NULL,
          record_count INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insertar configuración inicial de pesos si no existe
      const [configs] = await connection.execute('SELECT * FROM weight_configs WHERE version = ?', ['3.0']);
      
      if (configs.length === 0) {
        // Desactivar configuración anterior si existe
        await connection.execute('UPDATE weight_configs SET is_active = FALSE WHERE is_active = TRUE');
        
        // Insertar nueva configuración con pesos actualizados para el modelo de 4 factores (total 100%)
        await connection.execute(
          'INSERT INTO weight_configs (version, pitcher_weight, batting_weight, bullpen_weight, defense_weight, context_weight, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
          ['3.0', 0.35, 0.30, 0.25, 0.10, 0.00, true]
        );
      }

      connection.release();
      console.log('✅ Base de datos MySQL inicializada correctamente');
    } catch (error) {
      console.error('❌ Error inicializando la base de datos MySQL:', error);
      throw error;
    }
  };
}

module.exports = { pool, initializeDatabase };
