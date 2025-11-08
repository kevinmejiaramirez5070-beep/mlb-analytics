const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { initializeDatabase } = require('./config/database');
const gamesRouter = require('./routes/games');

const app = express();
const PORT = process.env.PORT || 5000;

// Configurar trust proxy para rate limiting
app.set('trust proxy', 1);

// Middleware de seguridad
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por ventana (aumentado para desarrollo)
  message: {
    error: 'Demasiadas requests desde esta IP, intenta de nuevo en 15 minutos.'
  }
});
app.use('/api/', limiter);

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rutas de la API
app.use('/api/games', gamesRouter);
app.use('/api/pitchers', require('./routes/pitchers'));

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'MLB Analytics API funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Ruta para probar la API de MLB
app.get('/api/test-mlb', async (req, res) => {
  try {
    const mlbService = require('./services/mlbService');
    
    // Probar obtención de equipos
    const teams = await mlbService.getTeams();
    
    // Probar obtención de partidos del día (usar fecha válida)
    const testDate = '2024-09-15'; // Fecha válida de la temporada 2024
    const games = await mlbService.getGamesByDate(testDate);
    
    // Probar obtención de roster de un equipo
    let rosterTest = null;
    if (teams.length > 0) {
      const firstTeam = teams[0];
      rosterTest = await mlbService.getTeamRoster(firstTeam.mlb_id, 2024);
    }
    
    res.json({
      success: true,
      message: 'Conexión con MLB API exitosa',
      teams_count: teams.length,
      games_count: games.length,
      roster_test: rosterTest ? rosterTest.length : 0,
      sample_teams: teams.slice(0, 3),
      sample_games: games.slice(0, 2)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ruta para probar específicamente pitchers probables
app.get('/api/test-probable-pitchers', async (req, res) => {
  try {
    const mlbService = require('./services/mlbService');
    
    // Obtener partidos de hoy y mañana
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log(`🔍 Probando pitchers probables para: ${today} y ${tomorrow}`);
    
    const results = [];
    
    for (const date of [today, tomorrow]) {
      try {
        // Obtener partidos de la fecha
        const games = await mlbService.getGamesByDate(date);
        
        if (games.length > 0) {
          // Probar con el primer partido
          const testGame = games[0];
          
          // Intentar obtener pitchers probables directamente del schedule
          const [year, month, day] = date.split('-');
          const formattedDate = `${month}/${day}/${year}`;
          
          const scheduleResponse = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${formattedDate}`);
          const scheduleData = await scheduleResponse.json();
          
          let probablePitchers = null;
          if (scheduleData.dates && scheduleData.dates.length > 0) {
            const scheduleGames = scheduleData.dates[0].games || [];
            const targetGame = scheduleGames.find(g => g.gamePk === parseInt(testGame.mlb_id));
            
            if (targetGame && targetGame.probablePitchers) {
              probablePitchers = targetGame.probablePitchers;
            }
          }
          
          results.push({
            date: date,
            game_id: testGame.mlb_id,
            home_team: testGame.home_team_id,
            away_team: testGame.away_team_id,
            probable_pitchers_found: !!probablePitchers,
            probable_pitchers: probablePitchers,
            schedule_data_available: !!scheduleData.dates
          });
        } else {
          results.push({
            date: date,
            games_found: 0,
            message: 'No hay partidos programados'
          });
        }
      } catch (dateError) {
        results.push({
          date: date,
          error: dateError.message
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Prueba de pitchers probables completada',
      results: results,
      summary: {
        total_dates_tested: results.length,
        dates_with_games: results.filter(r => r.game_id).length,
        dates_with_probable_pitchers: results.filter(r => r.probable_pitchers_found).length
      }
    });
    
  } catch (error) {
    console.error('Error en prueba de pitchers probables:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para limpiar datos de una fecha específica
app.get('/api/clear-games/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { pool } = require('./config/database');
    
    await pool.execute('DELETE FROM games WHERE DATE(game_date) = ?', [date]);
    
    res.json({
      success: true,
      message: `Datos de ${date} eliminados correctamente`
    });
  } catch (error) {
    console.error('Error limpiando datos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para verificar configuración de pesos activa
app.get('/api/weights/active', async (req, res) => {
  try {
    const { pool } = require('./config/database');
    
    const [rows] = await pool.execute(
      'SELECT * FROM weight_configs WHERE is_active = TRUE LIMIT 1'
    );
    
    if (rows.length === 0) {
      res.json({
        success: false,
        error: 'No hay configuración de pesos activa'
      });
    } else {
      const config = rows[0];
      const totalWeight = config.pitcher_weight + config.batting_weight + config.bullpen_weight + config.defense_weight + config.context_weight;
      
      res.json({
        success: true,
        config: config,
        total_weight: totalWeight,
        is_100_percent: Math.abs(totalWeight - 1.0) < 0.001
      });
    }
  } catch (error) {
    console.error('Error obteniendo pesos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para actualizar estructura de weight_configs
app.get('/api/fix-weight-configs-table', async (req, res) => {
  try {
    const { pool } = require('./config/database');
    
    // Agregar columna defense_weight si no existe
    try {
      await pool.execute('ALTER TABLE weight_configs ADD COLUMN defense_weight DECIMAL(3,2) NOT NULL DEFAULT 0.10');
      console.log('✅ Columna defense_weight agregada');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ Columna defense_weight ya existe');
      } else {
        throw error;
      }
    }
    
    // Eliminar columna history_weight si existe
    try {
      await pool.execute('ALTER TABLE weight_configs DROP COLUMN history_weight');
      console.log('✅ Columna history_weight eliminada');
    } catch (error) {
      if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('ℹ️ Columna history_weight no existe');
      } else {
        throw error;
      }
    }
    
    // Verificar la estructura actual
    const [columns] = await pool.execute('DESCRIBE weight_configs');
    
    res.json({
      success: true,
      message: 'Estructura de weight_configs actualizada',
      current_columns: columns.map(col => col.Field)
    });
  } catch (error) {
    console.error('Error actualizando weight_configs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para verificar y corregir ENUM de status
app.get('/api/fix-status-enum', async (req, res) => {
  try {
    const { pool } = require('./config/database');
    const dbType = process.env.DB_TYPE || 'mysql';
    
    // Primero, vamos a ver qué valores únicos de status tenemos en la base de datos
    // PostgreSQL usa sintaxis diferente para cadenas vacías
    const query = dbType === 'postgres' 
      ? 'SELECT DISTINCT status FROM games WHERE status IS NOT NULL AND status != $1'
      : 'SELECT DISTINCT status FROM games WHERE status != ?';
    const params = dbType === 'postgres' ? [''] : [''];
    
    const [uniqueStatuses] = await pool.execute(query, params);
    
    // También vamos a verificar qué valores únicos vienen de la API
    const mlbService = require('./services/mlbService');
    const today = new Date().toISOString().split('T')[0];
    const processedGames = await mlbService.getGamesByDate(today);
    const apiStatuses = [...new Set(processedGames.map(game => game.status))];
    
    // Solo intentar actualizar ENUM si es MySQL
    if (dbType === 'mysql') {
      try {
        await pool.execute(`
          ALTER TABLE games 
          MODIFY COLUMN status ENUM('scheduled', 'pre-game', 'warmup', 'live', 'in progress', 'final', 'delayed', 'postponed', 'cancelled', 'suspended', '') 
          DEFAULT ''
        `);
        
        res.json({
          success: true,
          message: 'ENUM actualizado correctamente',
          current_db_statuses: uniqueStatuses.map(s => s.status),
          api_statuses: apiStatuses,
          enum_updated: true
        });
      } catch (error) {
        res.json({
          success: false,
          error: error.message,
          current_db_statuses: uniqueStatuses.map(s => s.status),
          api_statuses: apiStatuses,
          enum_updated: false
        });
      }
    } else {
      // Para PostgreSQL, el CHECK constraint ya está en la tabla, no necesitamos modificar nada
      res.json({
        success: true,
        message: 'PostgreSQL usa CHECK constraint, no requiere actualización de ENUM',
        current_db_statuses: uniqueStatuses.map(s => s.status),
        api_statuses: apiStatuses,
        enum_updated: false,
        note: 'PostgreSQL usa VARCHAR con CHECK constraint en lugar de ENUM'
      });
    }
  } catch (error) {
    console.error('Error verificando ENUM:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para debug de guardado específico
app.get('/api/debug-save-specific/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { pool } = require('./config/database');
    const mlbService = require('./services/mlbService');
    
    // Obtener datos procesados por nuestro servicio
    const processedGames = await mlbService.getGamesByDate(date);
    
    // Simular el proceso de guardado para debug
    const saveDebug = [];
    
    for (const game of processedGames) {
      try {
        console.log(`Processing game ${game.mlb_id}: status = "${game.status}"`);
        
        // Obtener los IDs internos de los equipos
        const [homeTeam] = await pool.execute(
          'SELECT id FROM teams WHERE mlb_id = ?',
          [game.home_team_id]
        );
        
        const [awayTeam] = await pool.execute(
          'SELECT id FROM teams WHERE mlb_id = ?',
          [game.away_team_id]
        );
        
        if (homeTeam.length > 0 && awayTeam.length > 0) {
          const [existingGame] = await pool.execute(
            'SELECT * FROM games WHERE mlb_id = ?',
            [game.mlb_id]
          );
          
          if (existingGame.length === 0) {
            // Insertar nuevo partido
            const insertResult = await pool.execute(
              `INSERT INTO games (mlb_id, home_team_id, away_team_id, game_date, game_time, status)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [game.mlb_id, homeTeam[0].id, awayTeam[0].id, game.game_date, game.game_time, game.status]
            );
            
            saveDebug.push({
              mlb_id: game.mlb_id,
              action: 'INSERT',
              status: game.status,
              status_length: game.status ? game.status.length : 0,
              success: true,
              insert_id: insertResult[0].insertId
            });
          } else {
            // Actualizar partido existente
            const updateResult = await pool.execute(
              `UPDATE games SET status = ?, home_score = ?, away_score = ? WHERE mlb_id = ?`,
              [game.status, game.home_score, game.away_score, game.mlb_id]
            );
            
            saveDebug.push({
              mlb_id: game.mlb_id,
              action: 'UPDATE',
              status: game.status,
              status_length: game.status ? game.status.length : 0,
              success: true,
              affected_rows: updateResult[0].affectedRows
            });
          }
        } else {
          saveDebug.push({
            mlb_id: game.mlb_id,
            action: 'SKIP',
            status: game.status,
            success: false,
            error: 'Teams not found'
          });
        }
      } catch (error) {
        saveDebug.push({
          mlb_id: game.mlb_id,
          action: 'ERROR',
          status: game.status,
          success: false,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      date: date,
      total_processed_games: processedGames.length,
      save_debug: saveDebug
    });
  } catch (error) {
    console.error('Error en debug guardado específico:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para debug de lectura de base de datos
app.get('/api/debug-read/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { pool } = require('./config/database');
    
    // Leer directamente de la base de datos sin JOINs
    const [rawGames] = await pool.execute(
      'SELECT * FROM games WHERE DATE(game_date) = ? ORDER BY game_time ASC',
      [date]
    );
    
    // Leer con JOINs (como lo hace el endpoint normal)
    const [joinedGames] = await pool.execute(`
      SELECT g.*, 
             ht.name as home_team_name, ht.abbreviation as home_team_abbr,
             at.name as away_team_name, at.abbreviation as away_team_abbr
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE g.game_date = ?
      ORDER BY g.game_time ASC
    `, [date]);
    
    const readDebug = rawGames.map(rawGame => {
      const joinedGame = joinedGames.find(jg => jg.mlb_id === rawGame.mlb_id);
      
      return {
        mlb_id: rawGame.mlb_id,
        raw_status: rawGame.status,
        raw_status_type: typeof rawGame.status,
        raw_status_length: rawGame.status ? rawGame.status.length : 0,
        joined_status: joinedGame ? joinedGame.status : 'NOT_FOUND',
        joined_status_type: joinedGame ? typeof joinedGame.status : 'N/A',
        joined_status_length: joinedGame && joinedGame.status ? joinedGame.status.length : 0,
        status_match: rawGame.status === (joinedGame ? joinedGame.status : ''),
        joined_game_found: !!joinedGame
      };
    });
    
    res.json({
      success: true,
      date: date,
      total_raw_games: rawGames.length,
      total_joined_games: joinedGames.length,
      read_debug: readDebug
    });
  } catch (error) {
    console.error('Error en debug lectura:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para debug de valores nulos
app.get('/api/debug-null-values/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Obtener datos directos de MLB API
    const [year, month, day] = date.split('-');
    const formattedDate = `${month}/${day}/${year}`;
    const response = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${formattedDate}`);
    const data = await response.json();
    
    if (!data.dates || data.dates.length === 0) {
      return res.json({ success: false, message: 'No hay datos para esta fecha' });
    }
    
    const games = data.dates[0].games || [];
    const nullDebug = games.map(game => {
      const detailedState = game.status.detailedState;
      
      return {
        mlb_id: game.gamePk,
        home_team: game.teams.home.team.name,
        away_team: game.teams.away.team.name,
        detailedState: detailedState,
        detailedState_type: typeof detailedState,
        detailedState_null: detailedState === null,
        detailedState_undefined: detailedState === undefined,
        detailedState_empty: detailedState === '',
        detailedState_length: detailedState ? detailedState.length : 0,
        status_object: game.status,
        status_keys: Object.keys(game.status || {})
      };
    });
    
    res.json({
      success: true,
      date: formattedDate,
      total_games: games.length,
      null_debug: nullDebug
    });
  } catch (error) {
    console.error('Error en debug valores nulos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para debug de guardado en base de datos
app.get('/api/debug-save/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { pool } = require('./config/database');
    const mlbService = require('./services/mlbService');
    
    // Obtener datos procesados por nuestro servicio
    const processedGames = await mlbService.getGamesByDate(date);
    
    // Simular el proceso de guardado para debug
    const saveDebug = [];
    
    for (const game of processedGames) {
      try {
        // Obtener los IDs internos de los equipos
        const [homeTeam] = await pool.execute(
          'SELECT id FROM teams WHERE mlb_id = ?',
          [game.home_team_id]
        );
        
        const [awayTeam] = await pool.execute(
          'SELECT id FROM teams WHERE mlb_id = ?',
          [game.away_team_id]
        );
        
        if (homeTeam.length > 0 && awayTeam.length > 0) {
          const [existingGame] = await pool.execute(
            'SELECT * FROM games WHERE mlb_id = ?',
            [game.mlb_id]
          );
          
          if (existingGame.length === 0) {
            // Insertar nuevo partido
            await pool.execute(
              `INSERT INTO games (mlb_id, home_team_id, away_team_id, game_date, game_time, status)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [game.mlb_id, homeTeam[0].id, awayTeam[0].id, game.game_date, game.game_time, game.status]
            );
            
            saveDebug.push({
              mlb_id: game.mlb_id,
              action: 'INSERT',
              status: game.status,
              success: true
            });
          } else {
            // Actualizar partido existente
            await pool.execute(
              `UPDATE games SET status = ?, home_score = ?, away_score = ? WHERE mlb_id = ?`,
              [game.status, game.home_score, game.away_score, game.mlb_id]
            );
            
            saveDebug.push({
              mlb_id: game.mlb_id,
              action: 'UPDATE',
              status: game.status,
              success: true
            });
          }
        } else {
          saveDebug.push({
            mlb_id: game.mlb_id,
            action: 'SKIP',
            status: game.status,
            success: false,
            error: 'Teams not found'
          });
        }
      } catch (error) {
        saveDebug.push({
          mlb_id: game.mlb_id,
          action: 'ERROR',
          status: game.status,
          success: false,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      date: date,
      total_processed_games: processedGames.length,
      save_debug: saveDebug
    });
  } catch (error) {
    console.error('Error en debug guardado:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para debug de base de datos
app.get('/api/debug-database/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { pool } = require('./config/database');
    const mlbService = require('./services/mlbService');
    
    // Obtener datos procesados por nuestro servicio
    const processedGames = await mlbService.getGamesByDate(date);
    
    // Obtener datos de la base de datos
    const [dbGames] = await pool.execute(`
      SELECT g.*, 
             ht.name as home_team_name, ht.abbreviation as home_team_abbr,
             at.name as away_team_name, at.abbreviation as away_team_abbr
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE g.game_date = ?
      ORDER BY g.game_time ASC
    `, [date]);
    
    const dbDebug = processedGames.map(processedGame => {
      const dbGame = dbGames.find(dbg => dbg.mlb_id === processedGame.mlb_id);
      
      return {
        mlb_id: processedGame.mlb_id,
        home_team: processedGame.home_team_id,
        away_team: processedGame.away_team_id,
        processed_status: processedGame.status,
        db_status: dbGame ? dbGame.status : 'NOT_FOUND_IN_DB',
        status_match: processedGame.status === (dbGame ? dbGame.status : ''),
        db_game_found: !!dbGame,
        db_game_id: dbGame ? dbGame.id : null
      };
    });
    
    res.json({
      success: true,
      date: date,
      total_processed_games: processedGames.length,
      total_db_games: dbGames.length,
      db_debug: dbDebug
    });
  } catch (error) {
    console.error('Error en debug base de datos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para debug de procesamiento específico
app.get('/api/debug-processing-step/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const mlbService = require('./services/mlbService');
    
    // Obtener datos procesados por nuestro servicio
    const processedGames = await mlbService.getGamesByDate(date);
    
    // Obtener datos directos de MLB API para comparar
    const [year, month, day] = date.split('-');
    const formattedDate = `${month}/${day}/${year}`;
    const response = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${formattedDate}`);
    const data = await response.json();
    
    if (!data.dates || data.dates.length === 0) {
      return res.json({ success: false, message: 'No hay datos para esta fecha' });
    }
    
    const rawGames = data.dates[0].games || [];
    const comparisonDebug = rawGames.map((rawGame, index) => {
      const processedGame = processedGames.find(pg => pg.mlb_id === rawGame.gamePk);
      
      return {
        mlb_id: rawGame.gamePk,
        home_team: rawGame.teams.home.team.name,
        away_team: rawGame.teams.away.team.name,
        raw_detailedState: rawGame.status.detailedState,
        processed_status: processedGame ? processedGame.status : 'NOT_FOUND',
        status_match: rawGame.status.detailedState.toLowerCase() === (processedGame ? processedGame.status : ''),
        processed_game_found: !!processedGame
      };
    });
    
    res.json({
      success: true,
      date: formattedDate,
      total_raw_games: rawGames.length,
      total_processed_games: processedGames.length,
      comparison_debug: comparisonDebug
    });
  } catch (error) {
    console.error('Error en debug procesamiento:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para debug de estructura de datos
app.get('/api/debug-structure/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Obtener datos directos de MLB API
    const [year, month, day] = date.split('-');
    const formattedDate = `${month}/${day}/${year}`;
    const response = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${formattedDate}`);
    const data = await response.json();
    
    if (!data.dates || data.dates.length === 0) {
      return res.json({ success: false, message: 'No hay datos para esta fecha' });
    }
    
    const games = data.dates[0].games || [];
    const structureDebug = games.map(game => {
      return {
        mlb_id: game.gamePk,
        home_team: game.teams.home.team.name,
        away_team: game.teams.away.team.name,
        status_object: game.status,
        detailedState: game.status.detailedState,
        detailedState_type: typeof game.status.detailedState,
        detailedState_null: game.status.detailedState === null,
        detailedState_undefined: game.status.detailedState === undefined,
        detailedState_empty: game.status.detailedState === '',
        has_status: !!game.status,
        status_keys: Object.keys(game.status || {})
      };
    });
    
    res.json({
      success: true,
      date: formattedDate,
      total_games: games.length,
      structure_debug: structureDebug
    });
  } catch (error) {
    console.error('Error en debug estructura:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para debug completo de procesamiento
app.get('/api/debug-full/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const mlbService = require('./services/mlbService');
    
    // Obtener datos directos de MLB API
    const [year, month, day] = date.split('-');
    const formattedDate = `${month}/${day}/${year}`;
    const response = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${formattedDate}`);
    const data = await response.json();
    
    if (!data.dates || data.dates.length === 0) {
      return res.json({ success: false, message: 'No hay datos para esta fecha' });
    }
    
    const games = data.dates[0].games || [];
    const fullDebug = games.map(game => {
      const originalStatus = game.status.detailedState;
      const processedStatus = originalStatus.toLowerCase();
      
      return {
        mlb_id: game.gamePk,
        home_team: game.teams.home.team.name,
        away_team: game.teams.away.team.name,
        originalStatus: originalStatus,
        processedStatus: processedStatus,
        statusLength: originalStatus ? originalStatus.length : 0,
        processedLength: processedStatus ? processedStatus.length : 0,
        hasDetailedState: !!game.status.detailedState,
        detailedStateType: typeof game.status.detailedState
      };
    });
    
    res.json({
      success: true,
      date: formattedDate,
      total_games: games.length,
      full_debug: fullDebug
    });
  } catch (error) {
    console.error('Error en debug completo:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para debug específico de scores del 17 de septiembre
app.get('/api/debug-sept-17-scores', async (req, res) => {
  try {
    const { pool } = require('./config/database');
    const mlbService = require('./services/mlbService');
    
    // Obtener partidos del 17 de septiembre de la base de datos
    const [dbGames] = await pool.execute(`
      SELECT g.*, 
             ht.name as home_team_name, ht.abbreviation as home_team_abbr,
             at.name as away_team_name, at.abbreviation as away_team_abbr
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE g.game_date = '2024-09-17'
      ORDER BY g.game_time ASC
    `);
    
    // Obtener datos actuales de la API de MLB para el 17 de septiembre
    const apiGames = await mlbService.getGamesByDate('2024-09-17');
    
    const comparison = dbGames.map(dbGame => {
      const apiGame = apiGames.find(ag => ag.mlb_id === dbGame.mlb_id);
      
      return {
        mlb_id: dbGame.mlb_id,
        home_team: dbGame.home_team_name,
        away_team: dbGame.away_team_name,
        db_status: dbGame.status,
        db_home_score: dbGame.home_score,
        db_away_score: dbGame.away_score,
        api_status: apiGame ? apiGame.status : 'NOT_FOUND_IN_API',
        api_home_score: apiGame ? apiGame.home_score : null,
        api_away_score: apiGame ? apiGame.away_score : null,
        scores_match: dbGame.home_score === (apiGame ? apiGame.home_score : null) && 
                     dbGame.away_score === (apiGame ? apiGame.away_score : null),
        status_match: dbGame.status === (apiGame ? apiGame.status : ''),
        needs_update: !apiGame || 
                     dbGame.home_score !== apiGame.home_score || 
                     dbGame.away_score !== apiGame.away_score ||
                     dbGame.status !== apiGame.status
      };
    });
    
    res.json({
      success: true,
      date: '2024-09-17',
      total_db_games: dbGames.length,
      total_api_games: apiGames.length,
      comparison: comparison,
      summary: {
        games_needing_update: comparison.filter(c => c.needs_update).length,
        games_with_scores: comparison.filter(c => c.db_home_score !== null && c.db_away_score !== null).length,
        games_final: comparison.filter(c => c.db_status === 'final').length
      }
    });
    
  } catch (error) {
    console.error('Error en debug scores 17 sept:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para actualizar scores de una fecha específica
app.get('/api/update-scores/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { pool } = require('./config/database');
    const mlbService = require('./services/mlbService');
    
    // Obtener datos actuales de la API de MLB
    const apiGames = await mlbService.getGamesByDate(date);
    
    const updateResults = [];
    
    for (const apiGame of apiGames) {
      try {
        // Actualizar el partido en la base de datos con los datos más recientes
        const updateResult = await pool.execute(
          `UPDATE games SET status = ?, home_score = ?, away_score = ? WHERE mlb_id = ?`,
          [apiGame.status, apiGame.home_score, apiGame.away_score, apiGame.mlb_id]
        );
        
        updateResults.push({
          mlb_id: apiGame.mlb_id,
          home_team: apiGame.home_team_id,
          away_team: apiGame.away_team_id,
          status: apiGame.status,
          home_score: apiGame.home_score,
          away_score: apiGame.away_score,
          updated: updateResult[0].affectedRows > 0,
          affected_rows: updateResult[0].affectedRows
        });
      } catch (error) {
        updateResults.push({
          mlb_id: apiGame.mlb_id,
          error: error.message,
          updated: false
        });
      }
    }
    
    res.json({
      success: true,
      date: date,
      total_api_games: apiGames.length,
      update_results: updateResults,
      summary: {
        successfully_updated: updateResults.filter(r => r.updated).length,
        failed_updates: updateResults.filter(r => !r.updated).length
      }
    });
    
  } catch (error) {
    console.error('Error actualizando scores:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para debug de procesamiento de estados
app.get('/api/debug-processing/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const mlbService = require('./services/mlbService');
    
    // Obtener datos directos de MLB API
    const [year, month, day] = date.split('-');
    const formattedDate = `${month}/${day}/${year}`;
    const response = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${formattedDate}`);
    const data = await response.json();
    
    if (!data.dates || data.dates.length === 0) {
      return res.json({ success: false, message: 'No hay datos para esta fecha' });
    }
    
    const games = data.dates[0].games || [];
    const processingDebug = games.map(game => {
      const originalStatus = game.status.detailedState;
      const processedStatus = originalStatus.toLowerCase();
      
      return {
        mlb_id: game.gamePk,
        home_team: game.teams.home.team.name,
        away_team: game.teams.away.team.name,
        originalStatus: originalStatus,
        processedStatus: processedStatus,
        statusLength: originalStatus ? originalStatus.length : 0,
        processedLength: processedStatus ? processedStatus.length : 0
      };
    });
    
    res.json({
      success: true,
      date: formattedDate,
      total_games: games.length,
      processing_debug: processingDebug
    });
  } catch (error) {
    console.error('Error en debug processing:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para debug de estados de partidos
app.get('/api/debug-games/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const mlbService = require('./services/mlbService');
    
    // Obtener datos directos de MLB API
    const [year, month, day] = date.split('-');
    const formattedDate = `${month}/${day}/${year}`;
    const response = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${formattedDate}`);
    const data = await response.json();
    
    if (!data.dates || data.dates.length === 0) {
      return res.json({ success: false, message: 'No hay datos para esta fecha' });
    }
    
    const games = data.dates[0].games || [];
    const statusDebug = games.map(game => ({
      mlb_id: game.gamePk,
      home_team: game.teams.home.team.name,
      away_team: game.teams.away.team.name,
      detailedState: game.status.detailedState,
      abstractGameState: game.status.abstractGameState,
      codedGameState: game.status.codedGameState,
      statusCode: game.status.statusCode
    }));
    
    res.json({
      success: true,
      date: formattedDate,
      total_games: games.length,
      status_debug: statusDebug
    });
  } catch (error) {
    console.error('Error en debug games:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para probar estados de la API de MLB
app.get('/api/test-mlb-statuses', async (req, res) => {
  try {
    const mlbService = require('./services/mlbService');
    
    // Probar diferentes fechas para capturar todos los estados
    const testDates = [
      '2024-09-15', // Fecha pasada
      '2024-09-16', // Fecha pasada
      '2024-09-17', // Fecha pasada
      '2024-12-18', // Fecha actual
      '2024-12-19', // Fecha futura
      '2024-12-20'  // Fecha futura
    ];
    
    const allStatuses = new Set();
    const statusCounts = {};
    
    for (const date of testDates) {
      try {
        const games = await mlbService.getGamesByDate(date);
        games.forEach(game => {
          allStatuses.add(game.status);
          statusCounts[game.status] = (statusCounts[game.status] || 0) + 1;
        });
      } catch (error) {
        console.log(`Error con fecha ${date}:`, error.message);
      }
    }
    
    res.json({
      success: true,
      message: 'Estados encontrados en MLB API',
      all_statuses: Array.from(allStatuses),
      status_counts: statusCounts,
      total_unique_statuses: allStatuses.size
    });
  } catch (error) {
    console.error('Error en test estados MLB:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Middleware para manejar errores
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
});

// Ruta para manejar rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada'
  });
});

// Función para iniciar el servidor
async function startServer() {
  try {
    // Inicializar base de datos
    await initializeDatabase();
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor MLB Analytics ejecutándose en puerto ${PORT}`);
      console.log(`📊 API disponible en: http://localhost:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🧪 Test MLB API: http://localhost:${PORT}/api/test-mlb`);
      
      // Arreglar ENUM de estados automáticamente después de iniciar (solo para MySQL)
      const dbType = process.env.DB_TYPE || 'mysql';
      if (dbType === 'mysql') {
        setTimeout(async () => {
          try {
            const response = await fetch(`http://localhost:${PORT}/api/fix-status-enum`);
            if (response.ok) {
              console.log('✅ ENUM de estados actualizado automáticamente');
            }
          } catch (enumError) {
            console.log('⚠️ No se pudo actualizar ENUM automáticamente');
          }
        }, 1000);
      } else {
        console.log('ℹ️ PostgreSQL usa CHECK constraint, no requiere actualización de ENUM');
      }
    });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

// Manejar señales de terminación
process.on('SIGINT', () => {
  console.log('\n🛑 Recibida señal SIGINT, cerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Recibida señal SIGTERM, cerrando servidor...');
  process.exit(0);
});

// Iniciar servidor solo si no estamos en Vercel (serverless)
if (process.env.VERCEL !== '1') {
  startServer();
} else {
  // En Vercel, inicializar la base de datos pero no iniciar el servidor
  // El servidor se maneja automáticamente por Vercel
  initializeDatabase().catch(error => {
    console.error('❌ Error inicializando base de datos en Vercel:', error);
  });
}

// Exportar app para Vercel serverless functions
module.exports = app;

