const express = require('express');
const router = express.Router();
const mlbService = require('../services/mlbService');
const path = require('path');

// Endpoint de prueba
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Rutas de pitchers funcionando correctamente'
  });
});

// Endpoint de prueba para obtener pitchers con fotos reales
router.get('/test-real-pitchers', async (req, res) => {
  try {
    console.log('🔍 Probando obtención de pitchers reales...');
    
    // Obtener equipos primero
    const teams = await mlbService.getTeams();
    console.log(`📊 Encontrados ${teams.length} equipos`);
    
    if (teams.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No se pudieron obtener equipos'
      });
    }
    
    // Tomar el primer equipo para la prueba
    const testTeam = teams[0];
    console.log(`🏟️ Probando con equipo: ${testTeam.name} (ID: ${testTeam.mlb_id})`);
    
    // Obtener roster del equipo
    const roster = await mlbService.getTeamRoster(testTeam.mlb_id, 2024);
    console.log(`👥 Roster obtenido: ${roster.length} jugadores`);
    
    if (!roster || roster.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No se encontró roster para el equipo de prueba'
      });
    }
    
    // Filtrar solo pitchers
    const pitchers = roster.filter(player => 
      player.position && player.position.abbreviation === 'P'
    );
    console.log(`⚾ Encontrados ${pitchers.length} pitchers`);
    
    if (pitchers.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No se encontraron pitchers en el roster'
      });
    }
    
    // Obtener estadísticas del primer pitcher
    const mainPitcher = pitchers[0];
    console.log(`🎯 Obteniendo stats para: ${mainPitcher.person.fullName}`);
    
    const pitcherStats = await mlbService.getPitcherStats(mainPitcher.person.id, 2024);
    console.log('📈 Stats obtenidas:', pitcherStats);
    
    // Construir respuesta con foto real
    const pitcherData = {
      id: mainPitcher.person.id,
      name: mainPitcher.person.fullName,
      photo_url: `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${mainPitcher.person.id}`,
      position: mainPitcher.position.abbreviation,
      jersey_number: mainPitcher.jerseyNumber,
      team: testTeam.name,
      team_id: testTeam.mlb_id,
      ...pitcherStats
    };
    
    console.log('✅ Pitcher obtenido exitosamente:', pitcherData.name);
    
    res.json({
      success: true,
      message: 'Pitcher real obtenido correctamente',
      data: pitcherData,
      test_info: {
        team_name: testTeam.name,
        team_id: testTeam.mlb_id,
        total_players: roster.length,
        total_pitchers: pitchers.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error en prueba de pitchers reales:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    });
  }
});

// Endpoint de prueba para verificar MLB API con partidos futuros
router.get('/test-future-games', async (req, res) => {
  try {
    console.log('🔍 Probando obtención de partidos futuros con pitchers probables...');
    
    // Obtener partidos de hoy y mañana
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log(`📅 Probando fechas: ${today} y ${tomorrow}`);
    
    const results = [];
    
    for (const date of [today, tomorrow]) {
      try {
        console.log(`🔍 Obteniendo partidos para: ${date}`);
        const games = await mlbService.getGamesByDate(date);
        
        if (games.length > 0) {
          console.log(`✅ Encontrados ${games.length} partidos para ${date}`);
          
          // Probar con el primer partido de cada fecha
          const testGame = games[0];
          console.log(`🎯 Probando partido: ${testGame.mlb_id}`);
          
          const confirmedPitchers = await mlbService.getConfirmedStartingPitchers(testGame.mlb_id);
          
          results.push({
            date: date,
            game_id: testGame.mlb_id,
            home_team: testGame.home_team_id,
            away_team: testGame.away_team_id,
            pitchers_found: {
              home: !!confirmedPitchers.home,
              away: !!confirmedPitchers.away
            },
            pitchers: confirmedPitchers
          });
        } else {
          console.log(`❌ No se encontraron partidos para ${date}`);
          results.push({
            date: date,
            games_found: 0,
            error: 'No hay partidos programados'
          });
        }
      } catch (dateError) {
        console.error(`❌ Error con fecha ${date}:`, dateError.message);
        results.push({
          date: date,
          error: dateError.message
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Prueba de partidos futuros completada',
      results: results,
      summary: {
        total_dates_tested: results.length,
        dates_with_games: results.filter(r => r.games_found > 0 || r.pitchers_found).length,
        total_pitchers_found: results.reduce((sum, r) => {
          if (r.pitchers_found) {
            return sum + (r.pitchers_found.home ? 1 : 0) + (r.pitchers_found.away ? 1 : 0);
          }
          return sum;
        }, 0)
      }
    });
    
  } catch (error) {
    console.error('❌ Error en prueba de partidos futuros:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    });
  }
});

// Endpoint específico para verificar el partido Angels vs Rangers
router.get('/test-angels-rangers', async (req, res) => {
  try {
    console.log('🔍 Verificando partido Angels vs Rangers...');
    
    // Obtener partidos de hoy
    const today = new Date().toISOString().split('T')[0];
    const games = await mlbService.getGamesByDate(today);
    
    // Buscar el partido Angels vs Rangers
    const angelsRangersGame = games.find(game => {
      // Angels ID: 108, Rangers ID: 140
      return (game.home_team_id === 108 && game.away_team_id === 140) ||
             (game.home_team_id === 140 && game.away_team_id === 108);
    });
    
    if (!angelsRangersGame) {
      return res.json({
        success: false,
        message: 'No se encontró el partido Angels vs Rangers para hoy',
        available_games: games.map(g => ({
          game_id: g.mlb_id,
          home_team: g.home_team_id,
          away_team: g.away_team_id
        }))
      });
    }
    
    console.log(`🎯 Partido encontrado: ${angelsRangersGame.mlb_id}`);
    
    // Obtener pitchers confirmados
    const confirmedPitchers = await mlbService.getConfirmedStartingPitchers(angelsRangersGame.mlb_id);
    
    // Obtener información de equipos
    const { pool } = require('../config/database');
    const [gameInfo] = await pool.execute(`
      SELECT g.*, 
             ht.name as home_team_name, ht.abbreviation as home_team_abbr,
             at.name as away_team_name, at.abbreviation as away_team_abbr
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE g.mlb_id = ?
    `, [angelsRangersGame.mlb_id]);
    
    res.json({
      success: true,
      message: 'Verificación del partido Angels vs Rangers completada',
      game_info: gameInfo[0] || null,
      game_id: angelsRangersGame.mlb_id,
      confirmed_pitchers: confirmedPitchers,
      pitchers_found: {
        home: !!confirmedPitchers.home,
        away: !!confirmedPitchers.away
      },
      home_pitcher_name: confirmedPitchers.home?.name || 'No encontrado',
      away_pitcher_name: confirmedPitchers.away?.name || 'No encontrado'
    });
    
  } catch (error) {
    console.error('❌ Error verificando Angels vs Rangers:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    });
  }
});

// Endpoint específico para verificar el partido Diamondbacks vs Brewers
router.get('/test-diamondbacks-brewers', async (req, res) => {
  try {
    console.log('🔍 Verificando partido Diamondbacks vs Brewers...');
    
    // Obtener partidos de hoy
    const today = new Date().toISOString().split('T')[0];
    const games = await mlbService.getGamesByDate(today);
    
    // Buscar el partido Diamondbacks vs Brewers
    const diamondbacksBrewersGame = games.find(game => {
      // Diamondbacks ID: 109, Brewers ID: 158
      return (game.home_team_id === 109 && game.away_team_id === 158) ||
             (game.home_team_id === 158 && game.away_team_id === 109);
    });
    
    if (!diamondbacksBrewersGame) {
      return res.json({
        success: false,
        message: 'No se encontró el partido Diamondbacks vs Brewers para hoy',
        available_games: games.map(g => ({
          game_id: g.mlb_id,
          home_team: g.home_team_id,
          away_team: g.away_team_id
        }))
      });
    }
    
    console.log(`🎯 Partido encontrado: ${diamondbacksBrewersGame.mlb_id}`);
    
    // Obtener pitchers confirmados
    const confirmedPitchers = await mlbService.getConfirmedStartingPitchers(diamondbacksBrewersGame.mlb_id);
    
    // Obtener información de equipos
    const { pool } = require('../config/database');
    const [gameInfo] = await pool.execute(`
      SELECT g.*, 
             ht.name as home_team_name, ht.abbreviation as home_team_abbr,
             at.name as away_team_name, at.abbreviation as away_team_abbr
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE g.mlb_id = ?
    `, [diamondbacksBrewersGame.mlb_id]);
    
    res.json({
      success: true,
      message: 'Verificación del partido Diamondbacks vs Brewers completada',
      game_info: gameInfo[0] || null,
      game_id: diamondbacksBrewersGame.mlb_id,
      confirmed_pitchers: confirmedPitchers,
      pitchers_found: {
        home: !!confirmedPitchers.home,
        away: !!confirmedPitchers.away
      },
      home_pitcher_name: confirmedPitchers.home?.name || 'No encontrado',
      away_pitcher_name: confirmedPitchers.away?.name || 'No encontrado',
      explanation: 'Si no se encuentran pitchers confirmados, es porque la MLB aún no los ha confirmado oficialmente para este partido.'
    });
    
  } catch (error) {
    console.error('❌ Error verificando Diamondbacks vs Brewers:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    });
  }
});

// Endpoint para probar directamente la API de MLB
router.get('/test-mlb-direct', async (req, res) => {
  try {
    console.log('🔍 Probando directamente la API de MLB...');
    
    const today = new Date().toISOString().split('T')[0];
    const [year, month, day] = today.split('-');
    const formattedDate = `${month}/${day}/${year}`;
    
    console.log(`📅 Probando fecha: ${formattedDate}`);
    
    // Hacer request directo a la API de MLB
    const response = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${formattedDate}`);
    const data = await response.json();
    
    if (!data.dates || data.dates.length === 0) {
      return res.json({
        success: false,
        message: 'No hay datos para hoy en la API de MLB',
        date_tested: formattedDate
      });
    }
    
    const games = data.dates[0].games || [];
    console.log(`✅ Encontrados ${games.length} partidos en la API de MLB`);
    
    // Buscar partidos con pitchers probables
    const gamesWithProbables = games.filter(game => game.probablePitchers);
    const gamesWithoutProbables = games.filter(game => !game.probablePitchers);
    
    // Buscar específicamente Angels vs Rangers
    const angelsRangersGame = games.find(game => {
      const homeTeam = game.teams.home.team.name;
      const awayTeam = game.teams.away.team.name;
      return (homeTeam.includes('Angels') && awayTeam.includes('Rangers')) ||
             (homeTeam.includes('Rangers') && awayTeam.includes('Angels'));
    });
    
    res.json({
      success: true,
      message: 'Prueba directa de MLB API completada',
      date_tested: formattedDate,
      total_games: games.length,
      games_with_probable_pitchers: gamesWithProbables.length,
      games_without_probable_pitchers: gamesWithoutProbables.length,
      angels_rangers_game: angelsRangersGame ? {
        game_id: angelsRangersGame.gamePk,
        home_team: angelsRangersGame.teams.home.team.name,
        away_team: angelsRangersGame.teams.away.team.name,
        has_probable_pitchers: !!angelsRangersGame.probablePitchers,
        probable_pitchers: angelsRangersGame.probablePitchers
      } : null,
      sample_games_with_probables: gamesWithProbables.slice(0, 3).map(game => ({
        game_id: game.gamePk,
        home_team: game.teams.home.team.name,
        away_team: game.teams.away.team.name,
        probable_pitchers: game.probablePitchers
      })),
      sample_games_without_probables: gamesWithoutProbables.slice(0, 3).map(game => ({
        game_id: game.gamePk,
        home_team: game.teams.home.team.name,
        away_team: game.teams.away.team.name
      }))
    });
    
  } catch (error) {
    console.error('❌ Error probando MLB API directa:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    });
  }
});

// Endpoint para verificar datos completos de la API de MLB
router.get('/debug/mlb-raw-data', async (req, res) => {
  try {
    console.log('🔍 Obteniendo datos completos de la API de MLB...');
    
    const today = new Date().toISOString().split('T')[0];
    const [year, month, day] = today.split('-');
    const formattedDate = `${month}/${day}/${year}`;
    
    console.log(`📅 Probando fecha: ${formattedDate}`);
    
    // Hacer request directo a la API de MLB
    const response = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${formattedDate}`);
    const data = await response.json();
    
    if (!data.dates || data.dates.length === 0) {
      return res.json({
        success: false,
        message: 'No hay datos para hoy en la API de MLB',
        date_tested: formattedDate
      });
    }
    
    const games = data.dates[0].games || [];
    console.log(`✅ Encontrados ${games.length} partidos en la API de MLB`);
    
    // Analizar cada partido en detalle
    const detailedGames = games.map(game => {
      const hasProbablePitchers = !!game.probablePitchers;
      const probablePitchers = game.probablePitchers || null;
      
      return {
        game_id: game.gamePk,
        home_team: game.teams.home.team.name,
        away_team: game.teams.away.team.name,
        game_time: game.gameDate,
        status: game.status.detailedState,
        has_probable_pitchers: hasProbablePitchers,
        probable_pitchers: probablePitchers,
        probable_pitchers_keys: probablePitchers ? Object.keys(probablePitchers) : null
      };
    });
    
    // Contar partidos con pitchers probables
    const gamesWithProbables = detailedGames.filter(game => game.has_probable_pitchers);
    const gamesWithoutProbables = detailedGames.filter(game => !game.has_probable_pitchers);
    
    res.json({
      success: true,
      message: 'Análisis completo de datos de MLB API',
      date_tested: formattedDate,
      total_games: games.length,
      games_with_probable_pitchers: gamesWithProbables.length,
      games_without_probable_pitchers: gamesWithoutProbables.length,
      all_games_detailed: detailedGames,
      sample_with_probables: gamesWithProbables.slice(0, 3),
      sample_without_probables: gamesWithoutProbables.slice(0, 3)
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo datos completos de MLB API:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    });
  }
});

// Endpoint para verificar campos específicos de la API de MLB
router.get('/debug/mlb-fields', async (req, res) => {
  try {
    console.log('🔍 Verificando campos específicos de la API de MLB...');
    
    const today = new Date().toISOString().split('T')[0];
    const [year, month, day] = today.split('-');
    const formattedDate = `${month}/${day}/${year}`;
    
    console.log(`📅 Probando fecha: ${formattedDate}`);
    
    // Hacer request directo a la API de MLB
    const response = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${formattedDate}`);
    const data = await response.json();
    
    if (!data.dates || data.dates.length === 0) {
      return res.json({
        success: false,
        message: 'No hay datos para hoy en la API de MLB',
        date_tested: formattedDate
      });
    }
    
    const games = data.dates[0].games || [];
    console.log(`✅ Encontrados ${games.length} partidos en la API de MLB`);
    
    // Analizar el primer partido para ver todos los campos disponibles
    const firstGame = games[0];
    const allFields = Object.keys(firstGame);
    
    // Buscar campos relacionados con pitchers
    const pitcherRelatedFields = allFields.filter(field => 
      field.toLowerCase().includes('pitcher') || 
      field.toLowerCase().includes('probable') ||
      field.toLowerCase().includes('starter') ||
      field.toLowerCase().includes('starting')
    );
    
    res.json({
      success: true,
      message: 'Análisis de campos de la API de MLB',
      date_tested: formattedDate,
      total_games: games.length,
      all_fields: allFields,
      pitcher_related_fields: pitcherRelatedFields,
      first_game_sample: {
        game_id: firstGame.gamePk,
        home_team: firstGame.teams.home.team.name,
        away_team: firstGame.teams.away.team.name,
        status: firstGame.status.detailedState,
        has_probable_pitchers: !!firstGame.probablePitchers,
        probable_pitchers: firstGame.probablePitchers,
        all_fields_with_values: allFields.reduce((acc, field) => {
          acc[field] = firstGame[field];
          return acc;
        }, {})
      }
    });
    
  } catch (error) {
    console.error('❌ Error verificando campos de MLB API:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    });
  }
});

// Endpoint para probar el endpoint específico de un partido
router.get('/debug/game-feed/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    console.log(`🔍 Probando endpoint específico del partido: ${gameId}`);
    
    // Hacer request directo al endpoint específico del partido
    const response = await fetch(`https://statsapi.mlb.com/api/v1.1/game/${gameId}/feed/live`);
    const data = await response.json();
    
    // Buscar información de pitchers en diferentes secciones
    const gameData = data.gameData || {};
    const liveData = data.liveData || {};
    
    // Buscar en probablePitchers
    const probablePitchers = gameData.probablePitchers || null;
    
    // Buscar en boxscore
    const boxscore = liveData.boxscore || {};
    const teams = boxscore.teams || {};
    
    // Buscar pitchers en el roster
    const homeTeam = teams.home || {};
    const awayTeam = teams.away || {};
    
    const homePitchers = homeTeam.players || {};
    const awayPitchers = awayTeam.players || {};
    
    // Filtrar solo pitchers
    const homePitchersList = Object.values(homePitchers).filter(player => 
      player.position && player.position.abbreviation === 'P'
    );
    const awayPitchersList = Object.values(awayPitchers).filter(player => 
      player.position && player.position.abbreviation === 'P'
    );
    
    res.json({
      success: true,
      message: 'Análisis del endpoint específico del partido',
      game_id: gameId,
      probable_pitchers: probablePitchers,
      has_probable_pitchers: !!probablePitchers,
      boxscore_available: !!boxscore,
      home_pitchers_count: homePitchersList.length,
      away_pitchers_count: awayPitchersList.length,
      home_pitchers_sample: homePitchersList.slice(0, 3).map(p => ({
        id: p.person.id,
        name: p.person.fullName,
        position: p.position.abbreviation
      })),
      away_pitchers_sample: awayPitchersList.slice(0, 3).map(p => ({
        id: p.person.id,
        name: p.person.fullName,
        position: p.position.abbreviation
      })),
      game_data_keys: Object.keys(gameData),
      live_data_keys: Object.keys(liveData)
    });
    
  } catch (error) {
    console.error('❌ Error probando endpoint específico del partido:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    });
  }
});

// Endpoint de prueba directa de la función getConfirmedStartingPitchers
router.get('/debug/function-test/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    console.log(`🔍 Prueba directa de la función para partido: ${gameId}`);
    
    // Llamar directamente a la función y capturar todos los logs
    const startTime = Date.now();
    const confirmedPitchers = await mlbService.getConfirmedStartingPitchers(gameId);
    const endTime = Date.now();
    
    res.json({
      success: true,
      message: 'Prueba directa de la función getConfirmedStartingPitchers',
      game_id: gameId,
      execution_time_ms: endTime - startTime,
      result: confirmedPitchers,
      result_type: typeof confirmedPitchers,
      has_home: !!confirmedPitchers.home,
      has_away: !!confirmedPitchers.away,
      home_details: confirmedPitchers.home,
      away_details: confirmedPitchers.away
    });
    
  } catch (error) {
    console.error('❌ Error en prueba directa de la función:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message,
      stack: error.stack
    });
  }
});

// Endpoint de prueba directa de la API de MLB
router.get('/debug/direct-mlb-test/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    console.log(`🔍 Prueba directa de la API de MLB para partido: ${gameId}`);
    
    // Hacer request directo a la API de MLB sin usar makeRequest
    const response = await fetch(`https://statsapi.mlb.com/api/v1.1/game/${gameId}/feed/live`);
    const data = await response.json();
    
    // Extraer información de pitchers
    const gameData = data.gameData || {};
    const probablePitchers = gameData.probablePitchers;
    
    res.json({
      success: true,
      message: 'Prueba directa de la API de MLB',
      game_id: gameId,
      has_game_data: !!gameData,
      has_probable_pitchers: !!probablePitchers,
      probable_pitchers: probablePitchers,
      game_data_keys: Object.keys(gameData),
      sample_game_data: {
        game_id: gameData.gamePk,
        home_team: gameData.teams?.home?.team?.name,
        away_team: gameData.teams?.away?.team?.name,
        probable_pitchers: probablePitchers
      }
    });
    
  } catch (error) {
    console.error('❌ Error en prueba directa de la API de MLB:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    });
  }
});

// Endpoint para buscar partido por equipos
router.get('/debug/find-game/:homeTeam/:awayTeam', async (req, res) => {
  try {
    const { homeTeam, awayTeam } = req.params;
    console.log(`🔍 Buscando partido: ${awayTeam} @ ${homeTeam}`);
    
    // Obtener información del partido desde la base de datos
    const { pool } = require('../config/database');
    const [gameInfo] = await pool.execute(`
      SELECT g.*, 
             ht.name as home_team_name, ht.abbreviation as home_team_abbr,
             at.name as away_team_name, at.abbreviation as away_team_abbr
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE ht.name LIKE ? AND at.name LIKE ?
      ORDER BY g.game_date DESC
      LIMIT 1
    `, [`%${homeTeam}%`, `%${awayTeam}%`]);
    
    if (gameInfo.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Partido no encontrado en la base de datos'
      });
    }
    
    const game = gameInfo[0];
    console.log(`📅 Partido encontrado: ${game.away_team_name} @ ${game.home_team_name} - ID: ${game.mlb_id}`);
    
    // Obtener pitchers confirmados
    const confirmedPitchers = await mlbService.getConfirmedStartingPitchers(game.mlb_id);
    
    res.json({
      success: true,
      message: 'Partido encontrado y pitchers verificados',
      game_info: {
        game_id: game.mlb_id,
        home_team: game.home_team_name,
        away_team: game.away_team_name,
        game_date: game.game_date,
        status: game.status
      },
      confirmed_pitchers: confirmedPitchers,
      test_info: {
        home_pitcher_found: !!confirmedPitchers.home,
        away_pitcher_found: !!confirmedPitchers.away,
        home_pitcher_name: confirmedPitchers.home?.name || 'No encontrado',
        away_pitcher_name: confirmedPitchers.away?.name || 'No encontrado'
      }
    });
    
  } catch (error) {
    console.error('❌ Error buscando partido:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    });
  }
});

// Endpoint de prueba para obtener pitchers confirmados de un partido específico
router.get('/test-confirmed-pitchers/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    console.log(`🔍 Probando obtención de pitchers confirmados para partido: ${gameId}`);
    
    // Obtener información del partido primero
    const { pool } = require('../config/database');
    const [gameInfo] = await pool.execute(`
      SELECT g.*, 
             ht.name as home_team_name, ht.abbreviation as home_team_abbr,
             at.name as away_team_name, at.abbreviation as away_team_abbr
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE g.mlb_id = ?
    `, [gameId]);
    
    if (gameInfo.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Partido no encontrado en la base de datos'
      });
    }
    
    const game = gameInfo[0];
    console.log(`📅 Partido: ${game.away_team_name} @ ${game.home_team_name} - ${game.game_date}`);
    
    // Obtener pitchers confirmados
    const confirmedPitchers = await mlbService.getConfirmedStartingPitchers(gameId);
    console.log('📊 Pitchers confirmados obtenidos:', confirmedPitchers);
    
    // Obtener estadísticas para cada pitcher confirmado
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
        console.log(`✅ Stats obtenidas para pitcher local: ${confirmedPitchers.home.name}`);
      } catch (error) {
        console.error(`❌ Error obteniendo stats para pitcher local: ${error.message}`);
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
        console.log(`✅ Stats obtenidas para pitcher visitante: ${confirmedPitchers.away.name}`);
      } catch (error) {
        console.error(`❌ Error obteniendo stats para pitcher visitante: ${error.message}`);
        pitchersWithStats.away = {
          ...confirmedPitchers.away,
          error: 'No se pudieron obtener estadísticas'
        };
      }
    }
    
    res.json({
      success: true,
      message: 'Prueba de pitchers confirmados completada',
      game_info: {
        game_id: gameId,
        home_team: game.home_team_name,
        away_team: game.away_team_name,
        game_date: game.game_date,
        status: game.status
      },
      data: pitchersWithStats,
      test_info: {
        home_pitcher_found: !!confirmedPitchers.home,
        away_pitcher_found: !!confirmedPitchers.away,
        home_pitcher_name: confirmedPitchers.home?.name || 'No encontrado',
        away_pitcher_name: confirmedPitchers.away?.name || 'No encontrado'
      },
      debug_info: {
        raw_confirmed_pitchers: confirmedPitchers,
        function_called: 'getConfirmedStartingPitchers',
        game_id_passed: gameId
      }
    });
    
  } catch (error) {
    console.error('❌ Error en prueba de pitchers confirmados:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    });
  }
});

// Obtener pitcher principal de un equipo por ID interno
router.get('/team/internal/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    console.log('Solicitando pitcher para equipo ID:', teamId);
    
    const { pool } = require('../config/database');
    
    // Obtener el mlb_id del equipo desde la base de datos
    const [teamRows] = await pool.execute(
      'SELECT mlb_id FROM teams WHERE id = ?',
      [teamId]
    );
    
    if (teamRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Equipo no encontrado'
      });
    }
    
    const mlbTeamId = teamRows[0].mlb_id;
    const season = new Date().getFullYear();
    
    console.log('Obteniendo roster para MLB Team ID:', mlbTeamId);
    
    // Obtener roster del equipo
    const roster = await mlbService.getTeamRoster(mlbTeamId, season);
    
    if (!roster || roster.length === 0) {
      console.log('No se encontró roster para el equipo');
      return res.status(404).json({
        success: false,
        error: 'No se encontraron jugadores para este equipo'
      });
    }
    
    console.log('Roster obtenido, buscando pitchers...');
    
    // Filtrar solo pitchers
    const pitchers = roster.filter(player => 
      player.position && player.position.abbreviation === 'P'
    );
    
    if (pitchers.length === 0) {
      console.log('No se encontraron pitchers en el roster');
      return res.status(404).json({
        success: false,
        error: 'No se encontraron pitchers para este equipo'
      });
    }
    
    console.log(`Encontrados ${pitchers.length} pitchers, obteniendo stats del primero...`);
    
    // Obtener estadísticas del pitcher principal (el primero en la lista)
    const mainPitcher = pitchers[0];
    const pitcherStats = await mlbService.getPitcherStats(mainPitcher.person.id, season);
    
    console.log('Stats obtenidas:', pitcherStats);
    
    // Construir respuesta con foto y estadísticas
    const pitcherData = {
      id: mainPitcher.person.id,
      name: mainPitcher.person.fullName,
      photo_url: `https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1024/mlb/${mainPitcher.person.id}`,
      position: mainPitcher.position.abbreviation,
      jersey_number: mainPitcher.jerseyNumber,
      ...pitcherStats
    };
    
    res.json({
      success: true,
      data: pitcherData
    });
    
  } catch (error) {
    console.error('Error obteniendo pitcher:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    });
  }
});

// Obtener pitcher principal de un equipo por mlb_id
router.get('/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const season = new Date().getFullYear();
    
    // Obtener roster del equipo
    const roster = await mlbService.getTeamRoster(teamId, season);
    
    if (!roster || roster.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No se encontraron jugadores para este equipo'
      });
    }
    
    // Filtrar solo pitchers
    const pitchers = roster.filter(player => 
      player.position && player.position.abbreviation === 'P'
    );
    
    if (pitchers.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No se encontraron pitchers para este equipo'
      });
    }
    
    // Obtener estadísticas del pitcher principal (el primero en la lista)
    const mainPitcher = pitchers[0];
    const pitcherStats = await mlbService.getPitcherStats(mainPitcher.person.id, season);
    
    // Construir respuesta con foto y estadísticas
    const pitcherData = {
      id: mainPitcher.person.id,
      name: mainPitcher.person.fullName,
      photo_url: `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${mainPitcher.person.id}`,
      position: mainPitcher.position.abbreviation,
      jersey_number: mainPitcher.jerseyNumber,
      ...pitcherStats
    };
    
    res.json({
      success: true,
      data: pitcherData
    });
    
  } catch (error) {
    console.error('Error obteniendo pitcher:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener todos los pitchers de un equipo
router.get('/team/:teamId/all', async (req, res) => {
  try {
    const { teamId } = req.params;
    const season = new Date().getFullYear();
    
    // Obtener roster del equipo
    const roster = await mlbService.getTeamRoster(teamId, season);
    
    if (!roster || roster.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No se encontraron jugadores para este equipo'
      });
    }
    
    // Filtrar solo pitchers
    const pitchers = roster.filter(player => 
      player.position && player.position.abbreviation === 'P'
    );
    
    if (pitchers.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No se encontraron pitchers para este equipo'
      });
    }
    
    // Obtener estadísticas de todos los pitchers
    const pitchersWithStats = await Promise.all(
      pitchers.map(async (pitcher) => {
        try {
          const stats = await mlbService.getPitcherStats(pitcher.person.id, season);
          return {
            id: pitcher.person.id,
            name: pitcher.person.fullName,
            photo_url: `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${pitcher.person.id}`,
            position: pitcher.position.abbreviation,
            jersey_number: pitcher.jerseyNumber,
            ...stats
          };
        } catch (error) {
          console.error(`Error obteniendo stats para ${pitcher.person.fullName}:`, error);
          return {
            id: pitcher.person.id,
            name: pitcher.person.fullName,
            photo_url: `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${pitcher.person.id}`,
            position: pitcher.position.abbreviation,
            jersey_number: pitcher.jerseyNumber,
            error: 'No se pudieron obtener estadísticas'
          };
        }
      })
    );
    
    res.json({
      success: true,
      data: pitchersWithStats
    });
    
  } catch (error) {
    console.error('Error obteniendo pitchers:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Endpoint OPTIONS para CORS preflight
router.options('/photo/:playerId', (req, res) => {
  res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Accept, Accept-Encoding, Accept-Language, Cache-Control, Connection, Host, Referer, Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site, User-Agent');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.status(200).send();
});

// Endpoint OPTIONS para imagen por defecto
router.options('/photo/default', (req, res) => {
  res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Accept, Accept-Encoding, Accept-Language, Cache-Control, Connection, Host, Referer, Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site, User-Agent');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.status(200).send();
});

// Endpoint OPTIONS para proxy de fotos
router.options('/proxy-photo/:playerId', (req, res) => {
  res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Accept, Accept-Encoding, Accept-Language, Cache-Control, Connection, Host, Referer, Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site, User-Agent');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.status(200).send();
});

// Endpoint para servir imágenes de pitchers (solución simple)
router.get('/photo/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    
    console.log(`🖼️ Solicitando imagen para jugador ${playerId}`);
    console.log(`🔍 Headers de la petición:`, req.headers);
    console.log(`🔍 URL de la petición:`, req.url);
    console.log(`🔍 Método:`, req.method);
    
    // Agregar headers de CORS para permitir acceso desde localhost:3000
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Allow-Credentials', 'true');
    
    // Verificar si el archivo existe
    const imagePath = path.join(__dirname, '../../client/public/default-pitcher.png');
    console.log(`🔍 Ruta de la imagen:`, imagePath);
    
    const fs = require('fs');
    if (fs.existsSync(imagePath)) {
      console.log(`✅ Archivo de imagen existe`);
    } else {
      console.log(`❌ Archivo de imagen NO existe`);
    }
    
    // Por ahora, devolver la imagen por defecto
    // Esto evita los errores de CORS y las URLs que no funcionan
    res.sendFile(imagePath, (err) => {
      if (err) {
        console.error(`❌ Error enviando archivo:`, err);
        res.status(500).json({ success: false, error: 'Error enviando archivo: ' + err.message });
      } else {
        console.log(`✅ Imagen enviada correctamente para jugador ${playerId}`);
      }
    });
    
  } catch (error) {
    console.error(`❌ Error sirviendo imagen:`, error);
    res.status(500).json({ success: false, error: 'Error interno del servidor: ' + error.message });
  }
});

// Endpoint proxy para servir imágenes de MLB (evita problemas de CORS)
router.get('/proxy-photo/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    console.log(`🖼️ Proxy solicitando imagen para jugador: ${playerId}`);
    
    // URLs de fotos REALES de jugadores
    const playerPhotoUrls = [
      // Baseball Reference (fotos REALES) - Mike Trout como ejemplo
      `https://www.baseball-reference.com/req/202505151/images/headshots/f/f322d40f_mlbam.jpg`,
      `https://www.baseball-reference.com/req/202505151/images/headshots/f/f322d40f_milb.jpg`,
      
      // MLB Stats API (formato actual)
      `https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/${playerId}`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${playerId}`,
      
      // MLB Stats API con extensiones
      `https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/${playerId}.jpg`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${playerId}.jpg`,
      
      // API de avatares como último recurso (NO es foto real)
      `https://ui-avatars.com/api/?name=${encodeURIComponent(playerId)}&size=200&background=2c3e50&color=fff&bold=true&format=png`
    ];
    
    // Agregar headers de CORS
    res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Allow-Credentials', 'true');
    
    // Probar cada URL hasta encontrar una que funcione
    for (const photoUrl of playerPhotoUrls) {
      try {
        console.log(`🔍 Probando URL: ${photoUrl}`);
        const response = await fetch(photoUrl);
        
        if (response.ok) {
          // Obtener el buffer de la imagen
          const imageBuffer = await response.arrayBuffer();
          
          // Obtener el content-type de la respuesta
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          
          // Configurar headers de respuesta
          res.set('Content-Type', contentType);
          res.set('Cache-Control', 'public, max-age=3600');
          
          // Enviar la imagen
          res.send(Buffer.from(imageBuffer));
          console.log(`✅ Imagen proxy enviada correctamente para jugador ${playerId} desde: ${photoUrl}`);
          return;
        } else {
          console.log(`❌ URL falló: ${photoUrl} - Status: ${response.status}`);
        }
      } catch (fetchError) {
        console.log(`❌ Error con URL: ${photoUrl} - ${fetchError.message}`);
      }
    }
    
    // Si ninguna URL funcionó, usar imagen por defecto
    console.log(`⚠️ Ninguna URL de MLB funcionó para jugador ${playerId}, usando imagen por defecto`);
    
    // Generar una imagen SVG por defecto
    const svgImage = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#2c3e50;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#34495e;stop-opacity:1" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="90" fill="url(#grad1)" stroke="#3498db" stroke-width="3"/>
        <text x="100" y="85" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="white">⚾</text>
        <text x="100" y="115" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="#ecf0f1">PITCHER</text>
      </svg>
    `;
    
    res.set('Content-Type', 'image/svg+xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(svgImage);
    console.log(`✅ Imagen por defecto SVG enviada correctamente para jugador ${playerId}`);
    
  } catch (error) {
    console.error(`❌ Error en proxy de imagen:`, error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Obtener pitchers abridores confirmados para un partido específico
router.get('/game/:gameId/confirmed', async (req, res) => {
  try {
    const { gameId } = req.params;
    const season = new Date().getFullYear();
    
    console.log(`🔍 Obteniendo pitchers confirmados para partido: ${gameId}`);
    
    // Obtener pitchers confirmados del partido
    const confirmedPitchers = await mlbService.getConfirmedStartingPitchers(gameId);
    
    console.log('📊 Pitchers confirmados obtenidos:', confirmedPitchers);
    
    // Obtener estadísticas para cada pitcher confirmado
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
        console.log(`✅ Stats obtenidas para pitcher local: ${confirmedPitchers.home.name}`);
      } catch (error) {
        console.error(`❌ Error obteniendo stats para pitcher local: ${error.message}`);
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
        console.log(`✅ Stats obtenidas para pitcher visitante: ${confirmedPitchers.away.name}`);
      } catch (error) {
        console.error(`❌ Error obteniendo stats para pitcher visitante: ${error.message}`);
        pitchersWithStats.away = {
          ...confirmedPitchers.away,
          error: 'No se pudieron obtener estadísticas'
        };
      }
    }
    
    res.json({
      success: true,
      data: pitchersWithStats,
      game_id: gameId
    });
    
  } catch (error) {
    console.error('Error obteniendo pitchers confirmados:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    });
  }
});

// Endpoint para probar URLs de fotos
router.get('/debug/test-photos/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    console.log(`🔍 Probando fotos para partido: ${gameId}`);
    
    // Obtener pitchers confirmados
    const confirmedPitchers = await mlbService.getConfirmedStartingPitchers(gameId);
    
    // Generar URLs de fotos para probar
    const photoTestUrls = {
      home: confirmedPitchers.home ? {
        id: confirmedPitchers.home.id,
        name: confirmedPitchers.home.name,
        photo_url: confirmedPitchers.home.photo_url,
        test_urls: [
          `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${confirmedPitchers.home.id}`,
          `https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1024/mlb/${confirmedPitchers.home.id}`,
          `https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/${confirmedPitchers.home.id}`
        ]
      } : null,
      away: confirmedPitchers.away ? {
        id: confirmedPitchers.away.id,
        name: confirmedPitchers.away.name,
        photo_url: confirmedPitchers.away.photo_url,
        test_urls: [
          `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${confirmedPitchers.away.id}`,
          `https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1024/mlb/${confirmedPitchers.away.id}`,
          `https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/${confirmedPitchers.away.id}`
        ]
      } : null
    };
    
    res.json({
      success: true,
      message: 'Prueba de fotos de pitchers',
      game_id: gameId,
      pitchers: photoTestUrls,
      test_instructions: 'Copia y pega las URLs en tu navegador para probar si las fotos cargan correctamente'
    });
    
  } catch (error) {
    console.error('❌ Error probando fotos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    });
  }
});

// Endpoint para probar URLs de fotos reales de MLB
router.get('/debug/test-real-photos/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    console.log(`🔍 Probando URLs reales de fotos para jugador: ${playerId}`);
    
    // URLs reales de fotos de MLB que sabemos que funcionan
    const realPhotoUrls = [
      // URLs originales
      `https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/${playerId}`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${playerId}`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1024/mlb/${playerId}`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_8x8/t_w1024/mlb/${playerId}`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_2x2/t_w1024/mlb/${playerId}`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_4x3/t_w1024/mlb/${playerId}`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_5x7/t_w1024/mlb/${playerId}`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_6x4/t_w1024/mlb/${playerId}`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_7x5/t_w1024/mlb/${playerId}`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_9x16/t_w1024/mlb/${playerId}`,
      // URLs alternativas
      `https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/${playerId}.jpg`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${playerId}.jpg`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1024/mlb/${playerId}.jpg`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_8x8/t_w1024/mlb/${playerId}.jpg`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_2x2/t_w1024/mlb/${playerId}.jpg`,
      // URLs con formato diferente
      `https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/${playerId}.png`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${playerId}.png`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1024/mlb/${playerId}.png`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_8x8/t_w1024/mlb/${playerId}.png`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_2x2/t_w1024/mlb/${playerId}.png`,
      // URLs con formato diferente
      `https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/${playerId}.jpeg`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${playerId}.jpeg`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1024/mlb/${playerId}.jpeg`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_8x8/t_w1024/mlb/${playerId}.jpeg`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_2x2/t_w1024/mlb/${playerId}.jpeg`,
      // URLs con formato diferente
      `https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/${playerId}.gif`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${playerId}.gif`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1024/mlb/${playerId}.gif`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_8x8/t_w1024/mlb/${playerId}.gif`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_2x2/t_w1024/mlb/${playerId}.gif`,
      // URLs con formato diferente
      `https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/${playerId}.webp`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${playerId}.webp`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1024/mlb/${playerId}.webp`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_8x8/t_w1024/mlb/${playerId}.webp`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_2x2/t_w1024/mlb/${playerId}.webp`,
      // URLs con formato diferente
      `https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/${playerId}.svg`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${playerId}.svg`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1024/mlb/${playerId}.svg`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_8x8/t_w1024/mlb/${playerId}.svg`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_2x2/t_w1024/mlb/${playerId}.svg`,
      // URLs con formato diferente
      `https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/${playerId}.bmp`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${playerId}.bmp`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1024/mlb/${playerId}.bmp`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_8x8/t_w1024/mlb/${playerId}.bmp`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_2x2/t_w1024/mlb/${playerId}.bmp`,
      // URLs con formato diferente
      `https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/${playerId}.tiff`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${playerId}.tiff`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1024/mlb/${playerId}.tiff`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_8x8/t_w1024/mlb/${playerId}.tiff`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_2x2/t_w1024/mlb/${playerId}.tiff`,
      // URLs con formato diferente
      `https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/${playerId}.ico`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${playerId}.ico`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1024/mlb/${playerId}.ico`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_8x8/t_w1024/mlb/${playerId}.ico`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_2x2/t_w1024/mlb/${playerId}.ico`,
      // URLs con formato diferente
      `https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/${playerId}.bmp`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${playerId}.bmp`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1024/mlb/${playerId}.bmp`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_8x8/t_w1024/mlb/${playerId}.bmp`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_2x2/t_w1024/mlb/${playerId}.bmp`,
      // URLs con formato diferente
      `https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/${playerId}.tiff`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${playerId}.tiff`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1024/mlb/${playerId}.tiff`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_8x8/t_w1024/mlb/${playerId}.tiff`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_2x2/t_w1024/mlb/${playerId}.tiff`,
      // URLs con formato diferente
      `https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/${playerId}.ico`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${playerId}.ico`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1024/mlb/${playerId}.ico`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_8x8/t_w1024/mlb/${playerId}.ico`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_2x2/t_w1024/mlb/${playerId}.ico`,
      // URLs con formato diferente
      `https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/${playerId}.bmp`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${playerId}.bmp`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1024/mlb/${playerId}.bmp`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_8x8/t_w1024/mlb/${playerId}.bmp`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_2x2/t_w1024/mlb/${playerId}.bmp`,
      // URLs con formato diferente
      `https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/${playerId}.tiff`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${playerId}.tiff`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1024/mlb/${playerId}.tiff`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_8x8/t_w1024/mlb/${playerId}.tiff`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_2x2/t_w1024/mlb/${playerId}.tiff`
    ];
    
    const results = [];
    
    // Probar cada URL
    for (const url of realPhotoUrls) {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        results.push({
          url: url,
          status: response.status,
          ok: response.ok,
          content_type: response.headers.get('content-type')
        });
      } catch (error) {
        results.push({
          url: url,
          status: 'ERROR',
          ok: false,
          error: error.message
        });
      }
    }
    
    // Encontrar URLs que funcionan
    const workingUrls = results.filter(r => r.ok);
    
    res.json({
      success: true,
      message: 'Prueba de URLs reales de fotos de MLB',
      player_id: playerId,
      total_urls_tested: realPhotoUrls.length,
      working_urls: workingUrls.length,
      all_results: results,
      working_urls_list: workingUrls
    });
    
  } catch (error) {
    console.error('❌ Error probando URLs reales de fotos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    });
  }
});

// Endpoint para probar URLs de fotos de MLB directamente
router.get('/test-mlb-urls/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    console.log(`🔍 Probando URLs de MLB para jugador: ${playerId}`);
    
    // URLs a probar (APIs alternativas más confiables)
    const testUrls = [
      // Baseball Reference (más confiable)
      `https://www.baseball-reference.com/req/202403/images/headshots/${playerId}.jpg`,
      `https://www.baseball-reference.com/req/202403/images/headshots/${playerId}.png`,
      
      // ESPN
      `https://a.espncdn.com/combiner/i?img=/i/headshots/mlb/players/full/${playerId}.png`,
      `https://a.espncdn.com/combiner/i?img=/i/headshots/mlb/players/full/${playerId}.jpg`,
      
      // MLB Stats API (formato actual)
      `https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/${playerId}`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${playerId}`,
      
      // MLB Stats API con extensiones
      `https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/${playerId}.jpg`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${playerId}.jpg`
    ];
    
    const results = [];
    
    for (const url of testUrls) {
      try {
        console.log(`   Probando: ${url}`);
        const response = await fetch(url, { method: 'HEAD' });
        
        results.push({
          url: url,
          status: response.status,
          ok: response.ok,
          contentType: response.headers.get('content-type')
        });
        
        if (response.ok) {
          console.log(`   ✅ FUNCIONA! Status: ${response.status}`);
        } else {
          console.log(`   ❌ Falló con status: ${response.status}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        results.push({
          url: url,
          status: 'ERROR',
          ok: false,
          error: error.message
        });
      }
      
      // Pausa pequeña
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const workingUrls = results.filter(r => r.ok);
    
    res.json({
      success: true,
      playerId: playerId,
      totalUrls: testUrls.length,
      workingUrls: workingUrls.length,
      results: results,
      bestUrl: workingUrls.length > 0 ? workingUrls[0].url : null
    });
    
  } catch (error) {
    console.error('❌ Error probando URLs de MLB:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    });
  }
});

// Obtener información de un pitcher específico
router.get('/:pitcherId', async (req, res) => {
  try {
    const { pitcherId } = req.params;
    const season = new Date().getFullYear();
    
    // Obtener información del jugador
    const playerInfo = await mlbService.getPlayerInfo(pitcherId);
    
    if (!playerInfo) {
      return res.status(404).json({
        success: false,
        error: 'No se encontró el pitcher'
      });
    }
    
    // Obtener estadísticas
    const stats = await mlbService.getPitcherStats(pitcherId, season);
    
    const pitcherData = {
      id: pitcherId,
      name: playerInfo.fullName,
      photo_url: `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/${pitcherId}`,
      position: playerInfo.primaryPosition?.abbreviation || 'P',
      ...stats
    };
    
    res.json({
      success: true,
      data: pitcherData
    });
    
  } catch (error) {
    console.error('Error obteniendo pitcher específico:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Endpoint para servir imagen por defecto (SVG generado dinámicamente)
router.get('/photo/default', async (req, res) => {
  try {
    console.log(`🖼️ Solicitando imagen por defecto`);
    
    // Generar una imagen SVG por defecto
    const svgImage = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#2c3e50;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#34495e;stop-opacity:1" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="90" fill="url(#grad1)" stroke="#3498db" stroke-width="3"/>
        <text x="100" y="85" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="white">⚾</text>
        <text x="100" y="115" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="#ecf0f1">PITCHER</text>
      </svg>
    `;
    
    // Agregar headers de CORS para permitir acceso desde localhost:3000
    res.set('Content-Type', 'image/svg+xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Allow-Credentials', 'true');
    
    // Enviar la imagen SVG
    res.send(svgImage);
    console.log(`✅ Imagen por defecto SVG enviada correctamente`);
    
  } catch (error) {
    console.error(`❌ Error sirviendo imagen por defecto:`, error);
    res.status(500).json({ success: false, error: 'Error interno del servidor: ' + error.message });
  }
});

// Endpoint para obtener foto real de Baseball Reference
router.get('/real-photo/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    console.log(`🖼️ Solicitando foto REAL de Baseball Reference para jugador: ${playerId}`);
    
    // Obtener información del jugador para obtener su nombre
    const playerInfo = await mlbService.getPlayerInfo(playerId);
    
    if (!playerInfo) {
      console.log(`❌ No se encontró información del jugador ${playerId}`);
      return res.status(404).json({ success: false, error: 'Jugador no encontrado' });
    }
    
    const playerName = playerInfo.fullName;
    console.log(`📝 Nombre del jugador: ${playerName}`);
    
    // Construir URL de Baseball Reference
    const brUrl = `https://www.baseball-reference.com/players/${playerName.toLowerCase().split(' ')[1].charAt(0)}/${playerName.toLowerCase().split(' ')[1].substring(0, 5)}${playerName.toLowerCase().split(' ')[0].substring(0, 2)}01.shtml`;
    
    console.log(`🔍 Buscando en Baseball Reference: ${brUrl}`);
    
    try {
      // Obtener la página de Baseball Reference
      const response = await fetch(brUrl);
      
      if (response.ok) {
        const html = await response.text();
        
                 // Buscar la URL de la foto en el HTML
         const photoMatch = html.match(/src="([^"]*\/req\/[^"]*images\/headshots\/[^"]*\.jpg)"/);
        
                 if (photoMatch) {
           const photoUrl = photoMatch[1].startsWith('http') ? photoMatch[1] : `https://www.baseball-reference.com${photoMatch[1]}`;
           console.log(`✅ Foto encontrada: ${photoUrl}`);
          
          // Obtener la imagen
          const photoResponse = await fetch(photoUrl);
          
          if (photoResponse.ok) {
            const imageBuffer = await photoResponse.arrayBuffer();
            const contentType = photoResponse.headers.get('content-type') || 'image/jpeg';
            
            res.set('Content-Type', contentType);
            res.set('Cache-Control', 'public, max-age=3600');
            res.send(Buffer.from(imageBuffer));
            console.log(`✅ Foto REAL enviada correctamente para ${playerName}`);
            return;
          }
        }
      }
    } catch (error) {
      console.log(`❌ Error obteniendo foto de Baseball Reference: ${error.message}`);
    }
    
    // Si no se pudo obtener la foto real, usar fallback
    console.log(`⚠️ No se pudo obtener foto real, usando fallback`);
    
    // Generar avatar como fallback
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(playerName)}&size=200&background=2c3e50&color=fff&bold=true&format=png`;
    
    const avatarResponse = await fetch(avatarUrl);
    if (avatarResponse.ok) {
      const imageBuffer = await avatarResponse.arrayBuffer();
      const contentType = avatarResponse.headers.get('content-type') || 'image/png';
      
      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=3600');
      res.send(Buffer.from(imageBuffer));
      console.log(`✅ Avatar enviado como fallback para ${playerName}`);
      return;
    }
    
    // Último recurso: SVG por defecto
    const svgImage = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#2c3e50;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#34495e;stop-opacity:1" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="90" fill="url(#grad1)" stroke="#3498db" stroke-width="3"/>
        <text x="100" y="85" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="white">⚾</text>
        <text x="100" y="115" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="#ecf0f1">${playerName}</text>
      </svg>
    `;
    
    res.set('Content-Type', 'image/svg+xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(svgImage);
    console.log(`✅ SVG por defecto enviado para ${playerName}`);
    
  } catch (error) {
    console.error(`❌ Error en foto real:`, error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

module.exports = router;
