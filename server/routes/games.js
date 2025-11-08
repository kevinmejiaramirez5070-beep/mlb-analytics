const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const mlbService = require('../services/mlbService');
const analysisService = require('../services/analysisService');

// Obtener partidos del día
router.get('/today', async (req, res) => {
  try {
    // Usar la fecha actual en formato correcto para MLB API
    const today = req.query.date || new Date().toISOString().split('T')[0];
    
    // Obtener partidos de la API de MLB
    const mlbGames = await mlbService.getGamesByDate(today);
    
    // Guardar equipos si no existen
    for (const game of mlbGames) {
      // Verificar si el equipo local existe
      const [homeTeam] = await pool.execute(
        'SELECT * FROM teams WHERE mlb_id = ?',
        [game.home_team_id]
      );
      
      if (homeTeam.length === 0) {
        // Obtener información del equipo de MLB API
        const teams = await mlbService.getTeams();
        const team = teams.find(t => t.mlb_id === game.home_team_id);
        
        if (team) {
          await pool.execute(
            'INSERT INTO teams (mlb_id, name, abbreviation) VALUES (?, ?, ?)',
            [team.mlb_id, team.name, team.abbreviation]
          );
        }
      }
      
      // Verificar si el equipo visitante existe
      const [awayTeam] = await pool.execute(
        'SELECT * FROM teams WHERE mlb_id = ?',
        [game.away_team_id]
      );
      
      if (awayTeam.length === 0) {
        const teams = await mlbService.getTeams();
        const team = teams.find(t => t.mlb_id === game.away_team_id);
        
        if (team) {
          await pool.execute(
            'INSERT INTO teams (mlb_id, name, abbreviation) VALUES (?, ?, ?)',
            [team.mlb_id, team.name, team.abbreviation]
          );
        }
      }
    }
    
         // Guardar o actualizar partidos en la base de datos
     for (const game of mlbGames) {
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
         } else {
           // Actualizar partido existente con el status correcto
           await pool.execute(
             `UPDATE games SET status = ?, home_score = ?, away_score = ? WHERE mlb_id = ?`,
             [game.status, game.home_score, game.away_score, game.mlb_id]
           );
         }
       }
     }
    
         // Obtener partidos con información de equipos
     const [games] = await pool.execute(`
       SELECT g.*, 
              ht.name as home_team_name, ht.abbreviation as home_team_abbr,
              at.name as away_team_name, at.abbreviation as away_team_abbr
       FROM games g
       JOIN teams ht ON g.home_team_id = ht.id
       JOIN teams at ON g.away_team_id = at.id
       WHERE g.game_date = ?
       ORDER BY g.game_time ASC
     `, [today]);
    
    res.json({
      success: true,
      data: games,
      count: games.length
    });
    
  } catch (error) {
    console.error('Error obteniendo partidos del día:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener partidos por fecha
router.get('/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
         const [games] = await pool.execute(`
       SELECT g.*, 
              ht.name as home_team_name, ht.abbreviation as home_team_abbr,
              at.name as away_team_name, at.abbreviation as away_team_abbr
       FROM games g
       JOIN teams ht ON g.home_team_id = ht.id
       JOIN teams at ON g.away_team_id = at.id
       WHERE g.game_date = ?
       ORDER BY g.game_time ASC
     `, [date]);
    
    res.json({
      success: true,
      data: games,
      count: games.length
    });
    
  } catch (error) {
    console.error('Error obteniendo partidos por fecha:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Analizar un partido específico
router.post('/analyze/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const analysis = await analysisService.analyzeGame(gameId);
    
    res.json({
      success: true,
      data: analysis
    });
    
  } catch (error) {
    console.error('Error analizando partido:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener información detallada de un partido específico
router.get('/:gameId/detailed', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    // Obtener información básica del partido
    const [games] = await pool.execute(`
      SELECT g.*, 
             ht.name as home_team_name, ht.abbreviation as home_team_abbr,
             at.name as away_team_name, at.abbreviation as away_team_abbr
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE g.mlb_id = ?
    `, [gameId]);
    
    if (games.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Partido no encontrado'
      });
    }
    
    const game = games[0];
    
    // Obtener pitchers confirmados para el partido
    const confirmedPitchers = await mlbService.getConfirmedStartingPitchers(gameId);
    
    // Obtener estadísticas de los pitchers confirmados
    const season = new Date().getFullYear();
    const pitchersWithStats = {
      home: null,
      away: null
    };
    
    if (confirmedPitchers.home) {
      try {
        const stats = await mlbService.getPitcherStats(confirmedPitchers.home.id, season);
        pitchersWithStats.home = {
          ...confirmedPitchers.home,
          ...stats
        };
      } catch (error) {
        console.error(`Error obteniendo stats para pitcher local: ${error.message}`);
        pitchersWithStats.home = {
          ...confirmedPitchers.home,
          error: 'No se pudieron obtener estadísticas'
        };
      }
    }
    
    if (confirmedPitchers.away) {
      try {
        const stats = await mlbService.getPitcherStats(confirmedPitchers.away.id, season);
        pitchersWithStats.away = {
          ...confirmedPitchers.away,
          ...stats
        };
      } catch (error) {
        console.error(`Error obteniendo stats para pitcher visitante: ${error.message}`);
        pitchersWithStats.away = {
          ...confirmedPitchers.away,
          error: 'No se pudieron obtener estadísticas'
        };
      }
    }
    
    res.json({
      success: true,
      data: {
        game: game,
        confirmed_pitchers: pitchersWithStats,
        pitchers_found: {
          home: !!confirmedPitchers.home,
          away: !!confirmedPitchers.away
        }
      }
    });
    
  } catch (error) {
    console.error('Error obteniendo información detallada del partido:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener análisis de un partido
router.get('/analysis/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    
         const [analysis] = await pool.execute(`
       SELECT a.*, 
              ht.name as home_team_name, at.name as away_team_name
       FROM analysis a
       JOIN games g ON a.game_id = g.id
       JOIN teams ht ON g.home_team_id = ht.id
       JOIN teams at ON g.away_team_id = at.id
       WHERE g.mlb_id = ?
       ORDER BY a.created_at DESC
       LIMIT 1
     `, [gameId]);
    
    if (analysis.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Análisis no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: analysis[0]
    });
    
  } catch (error) {
    console.error('Error obteniendo análisis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener estados actualizados en tiempo real
router.get('/live-status/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Obtener datos actualizados directamente de MLB API
    const mlbGames = await mlbService.getGamesByDate(date);
    
    // Actualizar estados en la base de datos
    for (const game of mlbGames) {
      await pool.execute(
        'UPDATE games SET status = ? WHERE mlb_id = ?',
        [game.status, game.mlb_id]
      );
    }
    
    // Obtener partidos actualizados con información de equipos
    const [games] = await pool.execute(`
      SELECT g.*, 
             ht.name as home_team_name, ht.abbreviation as home_team_abbr,
             at.name as away_team_name, at.abbreviation as away_team_abbr
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE g.game_date = ?
      ORDER BY g.game_time ASC
    `, [date]);
    
    res.json({
      success: true,
      data: games,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error actualizando estados en tiempo real:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener estados disponibles
router.get('/statuses', async (req, res) => {
  try {
    const [statuses] = await pool.execute(
      'SELECT DISTINCT status, COUNT(*) as count FROM games GROUP BY status ORDER BY count DESC'
    );
    
    res.json({
      success: true,
      data: statuses
    });
  } catch (error) {
    console.error('Error obteniendo estados:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener resumen de análisis (partidos analizados)
router.get('/summary', async (req, res) => {
  try {
    const { date, level, minProbability, team } = req.query;
    
    // Actualizar TODOS los partidos analizados con datos más recientes de la API
    try {
      // Obtener todos los partidos analizados que podrían necesitar actualización
      const [analyzedGames] = await pool.execute(`
        SELECT DISTINCT g.mlb_id, g.game_date, g.status, g.home_score, g.away_score
        FROM analysis a
        JOIN games g ON a.game_id = g.id
        WHERE g.game_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        ORDER BY g.game_date DESC
        LIMIT 20
      `);
      
      // Actualizar cada partido con datos más recientes de la API
      for (const game of analyzedGames) {
        try {
          // Buscar en múltiples fechas (ayer, hoy, mañana) para encontrar el partido
          const dates = [
            new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // ayer
            game.game_date, // fecha original
            new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]  // mañana
          ];
          
          let apiGame = null;
          for (const date of dates) {
            try {
              const apiGames = await mlbService.getGamesByDate(date);
              apiGame = apiGames.find(ag => ag.mlb_id === game.mlb_id);
              if (apiGame) break; // Si encontramos el partido, salir del loop
            } catch (dateError) {
              // Error silencioso para fechas sin partidos
            }
          }
          
          if (apiGame) {
            // Actualizar status y scores si han cambiado
            const needsUpdate = 
              game.status !== apiGame.status ||
              game.home_score !== apiGame.home_score ||
              game.away_score !== apiGame.away_score;
            
            if (needsUpdate) {
              await pool.execute(
                `UPDATE games SET status = ?, home_score = ?, away_score = ? WHERE mlb_id = ?`,
                [apiGame.status, apiGame.home_score, apiGame.away_score, game.mlb_id]
              );
            }
          }
        } catch (updateError) {
          // Error silencioso para partidos individuales
        }
      }
    } catch (updateError) {
      // Error silencioso para actualización general
    }
    
         let query = `
       SELECT a.*, 
              g.game_date, g.game_time, g.mlb_id, g.home_score, g.away_score, g.status,
              ht.name as home_team_name, ht.abbreviation as home_team_abbr,
              at.name as away_team_name, at.abbreviation as away_team_abbr
       FROM games g
       LEFT JOIN analysis a ON a.game_id = g.id
       JOIN teams ht ON g.home_team_id = ht.id
       JOIN teams at ON g.away_team_id = at.id
       WHERE 1=1
     `;
    
    const params = [];
    
    if (date) {
      query += ' AND g.game_date = ?';
      params.push(date);
    }
    
    if (level) {
      query += ' AND a.level = ?';
      params.push(level);
    }
    
    if (minProbability) {
      query += ' AND (a.home_probability >= ? OR a.away_probability >= ? OR a.home_probability IS NULL)';
      params.push(minProbability, minProbability);
    }
    
    if (team) {
      query += ' AND (ht.name LIKE ? OR at.name LIKE ? OR ht.abbreviation LIKE ? OR at.abbreviation LIKE ?)';
      const teamSearch = `%${team}%`;
      params.push(teamSearch, teamSearch, teamSearch, teamSearch);
    }
    
    query += ' ORDER BY COALESCE(GREATEST(a.home_probability, a.away_probability), 0) DESC, g.game_time ASC';
    
    const [analysis] = await pool.execute(query, params);
    
    res.json({
      success: true,
      data: analysis,
      count: analysis.length
    });
    
  } catch (error) {
    console.error('Error obteniendo resumen:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint de debug para verificar datos del resumen
router.get('/summary-debug', async (req, res) => {
  try {
    const { date, level, minProbability, team } = req.query;
    
    let query = `
      SELECT a.*, 
             g.game_date, g.game_time, g.mlb_id, g.home_score, g.away_score, g.status,
             ht.name as home_team_name, ht.abbreviation as home_team_abbr,
             at.name as away_team_name, at.abbreviation as away_team_abbr
      FROM analysis a
      JOIN games g ON a.game_id = g.id
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (date) {
      query += ' AND g.game_date = ?';
      params.push(date);
    }
    
    if (level) {
      query += ' AND a.level = ?';
      params.push(level);
    }
    
    if (minProbability) {
      query += ' AND (a.home_probability >= ? OR a.away_probability >= ? OR a.home_probability IS NULL)';
      params.push(minProbability, minProbability);
    }
    
    if (team) {
      query += ' AND (ht.name LIKE ? OR at.name LIKE ? OR ht.abbreviation LIKE ? OR at.abbreviation LIKE ?)';
      const teamSearch = `%${team}%`;
      params.push(teamSearch, teamSearch, teamSearch, teamSearch);
    }
    
    query += ' ORDER BY COALESCE(GREATEST(a.home_probability, a.away_probability), 0) DESC, g.game_time ASC';
    
    const [analysis] = await pool.execute(query, params);
    
    // Agregar información de debug
    const debugData = analysis.map(record => ({
      ...record,
      debug: {
        has_home_score: record.home_score !== null && record.home_score !== undefined,
        has_away_score: record.away_score !== null && record.away_score !== undefined,
        home_score_value: record.home_score,
        away_score_value: record.away_score,
        status_value: record.status,
        can_show_result: record.home_score !== null && record.away_score !== null && 
                        record.home_score !== undefined && record.away_score !== undefined
      }
    }));
    
    res.json({
      success: true,
      data: debugData,
      count: analysis.length,
      summary: {
        total_records: analysis.length,
        records_with_scores: analysis.filter(r => r.home_score !== null && r.away_score !== null).length,
        records_without_scores: analysis.filter(r => r.home_score === null || r.away_score === null).length
      }
    });
    
  } catch (error) {
    console.error('Error en debug resumen:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint temporal para ver fechas con partidos finales
router.get('/final-dates', async (req, res) => {
  try {
    const [dates] = await pool.execute(`
      SELECT DISTINCT g.game_date, 
             COUNT(*) as total_games,
             COUNT(CASE WHEN g.home_score IS NOT NULL AND g.away_score IS NOT NULL THEN 1 END) as games_with_scores
      FROM games g
      WHERE g.status = 'final'
      GROUP BY g.game_date
      ORDER BY g.game_date DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      data: dates
    });
    
  } catch (error) {
    console.error('Error obteniendo fechas finales:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


module.exports = router;

