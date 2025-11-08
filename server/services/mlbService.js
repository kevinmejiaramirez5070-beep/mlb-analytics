const axios = require('axios');
const https = require('https');

class MLBService {
  constructor() {
    this.baseURL = 'https://statsapi.mlb.com/api/v1';
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutos (aumentado para evitar rate limiting)
  }

  // Función para hacer requests con cache
  async makeRequest(endpoint, useCache = true) {
    const cacheKey = endpoint;
    
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    // Agregar delay para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        timeout: 15000, // Aumentado timeout
        headers: {
          'User-Agent': 'MLB-Analytics/1.0'
        },
        // Configuración SSL para Windows
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      });

      const data = response.data;
      
      if (useCache) {
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
      }

      return data;
    } catch (error) {
      console.error(`Error en MLB API (${endpoint}):`, error.message);
      
      // Si es error de rate limiting, esperar más tiempo
      if (error.response && error.response.status === 429) {
        console.log('⚠️ Rate limiting detectado, esperando 30 segundos...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        throw new Error('Rate limiting de MLB API. Intenta de nuevo en unos minutos.');
      }
      
      throw new Error(`Error al obtener datos de MLB API: ${error.message}`);
    }
  }

  // Obtener todos los equipos
  async getTeams() {
    try {
      const data = await this.makeRequest('/teams?sportIds=1');
      return data.teams.map(team => ({
        mlb_id: team.id,
        name: team.name,
        abbreviation: team.abbreviation
      }));
    } catch (error) {
      console.error('Error obteniendo equipos:', error);
      throw error;
    }
  }

  // Obtener partidos por fecha
  async getGamesByDate(date) {
    try {
      // Convertir fecha de YYYY-MM-DD a MM/DD/YYYY para MLB API
      const [year, month, day] = date.split('-');
      const formattedDate = `${month}/${day}/${year}`;
      const data = await this.makeRequest(`/schedule?sportId=1&date=${formattedDate}`);
      
      if (!data.dates || data.dates.length === 0) {
        return [];
      }

      const games = data.dates[0].games || [];
      return games.map(game => {
        const originalStatus = game.status.detailedState;
        const processedStatus = originalStatus ? originalStatus.toLowerCase() : '';
        
        return {
          mlb_id: game.gamePk,
          home_team_id: game.teams.home.team.id,
          away_team_id: game.teams.away.team.id,
          game_date: date,
          game_time: game.gameDate ? new Date(game.gameDate).toTimeString().split(' ')[0] : null,
          status: processedStatus,
          home_score: game.teams.home.score || null,
          away_score: game.teams.away.score || null
        };
      });
    } catch (error) {
      console.error('Error obteniendo partidos:', error);
      throw error;
    }
  }

  // Obtener estadísticas de un pitcher
  async getPitcherStats(personId, season = new Date().getFullYear()) {
    try {
      const data = await this.makeRequest(`/people/${personId}/stats?stats=season&group=pitching&season=${season}`);
      
      if (!data.stats || data.stats.length === 0) {
        return null;
      }

      const stats = data.stats[0].splits[0].stat;
      return {
        era: parseFloat(stats.era) || 0,
        whip: parseFloat(stats.whip) || 0,
        strikeOuts: parseInt(stats.strikeOuts) || 0,
        baseOnBalls: parseInt(stats.baseOnBalls) || 0,
        inningsPitched: parseFloat(stats.inningsPitched) || 0,
        wins: parseInt(stats.wins) || 0,
        losses: parseInt(stats.losses) || 0
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas del pitcher:', error);
      return null;
    }
  }

  // Obtener FIP de un pitcher específico
  async getPitcherFIP(personId, season = new Date().getFullYear()) {
    try {
      const data = await this.makeRequest(`/people/${personId}/stats?stats=season&group=pitching&season=${season}&fields=stats,group,type,splits,stat,fieldingIndependentPitching`);
      
      if (!data.stats || data.stats.length === 0) {
        return null;
      }

      const stats = data.stats[0].splits[0].stat;
      return parseFloat(stats.fieldingIndependentPitching) || 0;
    } catch (error) {
      console.error('Error obteniendo FIP del pitcher:', error);
      return null;
    }
  }

  // Obtener estadísticas de bateo de un equipo
  async getTeamBattingStats(teamId, season = new Date().getFullYear()) {
    try {
      const data = await this.makeRequest(`/teams/${teamId}/stats?stats=season&group=hitting&season=${season}`);
      
      if (!data.stats || data.stats.length === 0) {
        return null;
      }

      const stats = data.stats[0].splits[0].stat;
      return {
        avg: parseFloat(stats.avg) || 0,
        obp: parseFloat(stats.obp) || 0,
        slg: parseFloat(stats.slg) || 0,
        ops: parseFloat(stats.ops) || 0,
        homeRuns: parseInt(stats.homeRuns) || 0,
        runs: parseInt(stats.runs) || 0,
        hits: parseInt(stats.hits) || 0,
        baseOnBalls: parseInt(stats.baseOnBalls) || 0
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de bateo:', error);
      return null;
    }
  }

  // Obtener wRC+ de un equipo
  async getTeamWRCPlus(teamId, season = new Date().getFullYear()) {
    try {
      const data = await this.makeRequest(`/teams/${teamId}/stats?stats=season&group=hitting&season=${season}&fields=stats,group,type,splits,stat,wrcPlus`);
      
      if (!data.stats || data.stats.length === 0) {
        return null;
      }

      const stats = data.stats[0].splits[0].stat;
      return parseFloat(stats.wrcPlus) || 100; // Default a 100 si no está disponible
    } catch (error) {
      console.error('Error obteniendo wRC+ del equipo:', error);
      return 100; // Valor neutral si no se puede obtener
    }
  }

  // Obtener OPS vs LHP (Left Handed Pitchers)
  async getTeamOPSvsLHP(teamId, season = new Date().getFullYear()) {
    try {
      const data = await this.makeRequest(`/teams/${teamId}/stats?stats=vsLHP&group=hitting&season=${season}`);
      
      if (!data.stats || data.stats.length === 0) {
        return null;
      }

      const stats = data.stats[0].splits[0].stat;
      return parseFloat(stats.ops) || 0;
    } catch (error) {
      console.error('Error obteniendo OPS vs LHP:', error);
      return null;
    }
  }

  // Obtener OPS vs RHP (Right Handed Pitchers)
  async getTeamOPSvsRHP(teamId, season = new Date().getFullYear()) {
    try {
      const data = await this.makeRequest(`/teams/${teamId}/stats?stats=vsRHP&group=hitting&season=${season}`);
      
      if (!data.stats || data.stats.length === 0) {
        return null;
      }

      const stats = data.stats[0].splits[0].stat;
      return parseFloat(stats.ops) || 0;
    } catch (error) {
      console.error('Error obteniendo OPS vs RHP:', error);
      return null;
    }
  }

  // Obtener estadísticas RISP (Runners In Scoring Position)
  async getTeamRISP(teamId, season = new Date().getFullYear()) {
    try {
      const data = await this.makeRequest(`/teams/${teamId}/stats?stats=risp&group=hitting&season=${season}`);
      
      if (!data.stats || data.stats.length === 0) {
        return null;
      }

      const stats = data.stats[0].splits[0].stat;
      return {
        avg: parseFloat(stats.avg) || 0,
        ops: parseFloat(stats.ops) || 0,
        hits: parseInt(stats.hits) || 0,
        atBats: parseInt(stats.atBats) || 0
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas RISP:', error);
      return null;
    }
  }

  // Obtener información de un partido específico
  async getGameDetails(gameId) {
    try {
      const data = await this.makeRequest(`/game/${gameId}/feed/live`);
      return data;
    } catch (error) {
      console.error('Error obteniendo detalles del partido:', error);
      throw error;
    }
  }

  // Obtener probable pitcher para un partido
  async getProbablePitcher(gameId) {
    try {
      const data = await this.makeRequest(`/game/${gameId}/feed/live`);
      
      if (data.gameData && data.gameData.probablePitchers) {
        return {
          home: data.gameData.probablePitchers.home,
          away: data.gameData.probablePitchers.away
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error obteniendo probable pitcher:', error);
      return null;
    }
  }

  // Obtener foto de un jugador desde la API de MLB
  async getPlayerPhoto(playerId) {
    try {
      console.log(`🔍 Obteniendo foto para jugador: ${playerId}`);
      
      // URL más confiable para fotos de MLB (formato 3x4 - más común actualmente)
      const photoUrl = `https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/${playerId}`;
      console.log(`✅ Usando URL de foto para jugador ${playerId}: ${photoUrl}`);
      return photoUrl;
      
    } catch (error) {
      console.error(`❌ Error obteniendo foto para jugador ${playerId}:`, error);
      return `/api/pitchers/photo/default`;
    }
  }

  // Obtener pitchers abridores confirmados para un partido específico
  async getConfirmedStartingPitchers(gameId) {
    try {
      const confirmedPitchers = {
        home: null,
        away: null
      };

      console.log(`🔍 Buscando pitchers confirmados para partido: ${gameId}`);

      // ESTRATEGIA 1: Usar el endpoint específico del partido (más confiable)
      try {
        console.log(`🔍 Intentando obtener pitchers del endpoint específico del partido: ${gameId}`);
        
        // Usar fetch directamente en lugar de makeRequest para evitar problemas de caché o configuración
        const response = await fetch(`https://statsapi.mlb.com/api/v1.1/game/${gameId}/feed/live`);
        const data = await response.json();
        
        console.log('🔍 Respuesta completa de la API:', {
          has_game_data: !!data.gameData,
          game_data_keys: data.gameData ? Object.keys(data.gameData) : null,
          has_probable_pitchers: !!data.gameData?.probablePitchers
        });
        
        // Verificar si hay pitchers confirmados en gameData
        if (data.gameData && data.gameData.probablePitchers) {
          console.log('✅ Pitchers encontrados en endpoint específico del partido:', data.gameData.probablePitchers);
          
          if (data.gameData.probablePitchers.home) {
            const homePhotoUrl = await this.getPlayerPhoto(data.gameData.probablePitchers.home.id);
            confirmedPitchers.home = {
              id: data.gameData.probablePitchers.home.id,
              name: data.gameData.probablePitchers.home.fullName,
              photo_url: homePhotoUrl || `/default-pitcher.png`
            };
          }
          
          if (data.gameData.probablePitchers.away) {
            const awayPhotoUrl = await this.getPlayerPhoto(data.gameData.probablePitchers.away.id);
            confirmedPitchers.away = {
              id: data.gameData.probablePitchers.away.id,
              name: data.gameData.probablePitchers.away.fullName,
              photo_url: awayPhotoUrl || `/default-pitcher.png`
            };
          }
          
          // Si encontramos pitchers confirmados, retornar inmediatamente
          if (confirmedPitchers.home || confirmedPitchers.away) {
            console.log('✅ Pitchers confirmados obtenidos exitosamente');
            return confirmedPitchers;
          }
        } else {
          console.log('❌ No se encontraron probablePitchers en gameData');
        }
      } catch (liveError) {
        console.log('❌ No se pudo obtener del endpoint específico del partido:', liveError.message);
      }

      // ESTRATEGIA 2: Intentar obtener del schedule con fecha específica
      try {
        // Obtener información del partido desde la base de datos primero
        const { pool } = require('../config/database');
        const [gameInfo] = await pool.execute(
          'SELECT game_date FROM games WHERE mlb_id = ?',
          [gameId]
        );
        
        if (gameInfo.length > 0) {
          const gameDate = gameInfo[0].game_date;
          const [year, month, day] = gameDate.split('-');
          const formattedDate = `${month}/${day}/${year}`;
          
          console.log(`🔍 Intentando obtener pitchers del schedule para fecha: ${formattedDate}`);
          const scheduleData = await this.makeRequest(`/schedule?sportId=1&date=${formattedDate}`);
          
          if (scheduleData.dates && scheduleData.dates.length > 0) {
            const games = scheduleData.dates[0].games || [];
            const targetGame = games.find(g => g.gamePk === parseInt(gameId));
            
            if (targetGame && targetGame.probablePitchers) {
              console.log('✅ Pitchers encontrados en schedule:', targetGame.probablePitchers);
              
              if (targetGame.probablePitchers.home) {
                const homePhotoUrl = await this.getPlayerPhoto(targetGame.probablePitchers.home.id);
                confirmedPitchers.home = {
                  id: targetGame.probablePitchers.home.id,
                  name: targetGame.probablePitchers.home.fullName,
                  photo_url: homePhotoUrl || `/default-pitcher.png`
                };
              }
              
              if (targetGame.probablePitchers.away) {
                const awayPhotoUrl = await this.getPlayerPhoto(targetGame.probablePitchers.away.id);
                confirmedPitchers.away = {
                  id: targetGame.probablePitchers.away.id,
                  name: targetGame.probablePitchers.away.fullName,
                  photo_url: awayPhotoUrl || `/default-pitcher.png`
                };
              }
              
              // Si encontramos pitchers confirmados, retornar inmediatamente
              if (confirmedPitchers.home || confirmedPitchers.away) {
                console.log('✅ Pitchers confirmados obtenidos del schedule');
                return confirmedPitchers;
              }
            }
          }
        }
      } catch (scheduleError) {
        console.log('❌ No se pudo obtener del schedule:', scheduleError.message);
      }

      // Si no se encontraron en schedule, intentar con live feed (para partidos en vivo o ya jugados)
      if (!confirmedPitchers.home && !confirmedPitchers.away) {
        try {
          console.log(`🔍 Intentando obtener pitchers del live feed para gameId: ${gameId}`);
          const data = await this.makeRequest(`/game/${gameId}/feed/live`);
          
          // Verificar si hay pitchers confirmados en gameData
          if (data.gameData && data.gameData.probablePitchers) {
            console.log('✅ Pitchers encontrados en live feed:', data.gameData.probablePitchers);
            
            if (data.gameData.probablePitchers.home) {
              const homePhotoUrl = await this.getPlayerPhoto(data.gameData.probablePitchers.home.id);
              confirmedPitchers.home = {
                id: data.gameData.probablePitchers.home.id,
                name: data.gameData.probablePitchers.home.fullName,
                photo_url: homePhotoUrl
              };
            }
            
            if (data.gameData.probablePitchers.away) {
              const awayPhotoUrl = await this.getPlayerPhoto(data.gameData.probablePitchers.away.id);
              confirmedPitchers.away = {
                id: data.gameData.probablePitchers.away.id,
                name: data.gameData.probablePitchers.away.fullName,
                photo_url: awayPhotoUrl
              };
            }
          }

          // Si no hay pitchers confirmados, intentar obtener del liveData
          if (!confirmedPitchers.home && !confirmedPitchers.away && data.liveData) {
            const plays = data.liveData.plays?.allPlays || [];
            
            // Buscar el primer pitcher de cada equipo en los plays
            for (const play of plays) {
              if (play.matchup && play.matchup.pitcher) {
                const pitcher = play.matchup.pitcher;
                const team = play.about.halfInning === 'top' ? 'away' : 'home';
                
                if (!confirmedPitchers[team]) {
                  const pitcherPhotoUrl = await this.getPlayerPhoto(pitcher.id);
                  confirmedPitchers[team] = {
                    id: pitcher.id,
                    name: pitcher.fullName,
                    photo_url: pitcherPhotoUrl
                  };
                }
              }
            }
          }
        } catch (liveError) {
          console.log('❌ No se pudo obtener del live feed:', liveError.message);
        }
      }

      // Si aún no hay pitchers confirmados, intentar obtener del boxscore
      if (!confirmedPitchers.home && !confirmedPitchers.away) {
        try {
          console.log(`🔍 Intentando obtener pitchers del boxscore para gameId: ${gameId}`);
          const boxscoreData = await this.makeRequest(`/game/${gameId}/boxscore`);
          
          if (boxscoreData.teams) {
            // Buscar pitchers en el boxscore
            if (boxscoreData.teams.home && boxscoreData.teams.home.pitchers) {
              const homePitchers = boxscoreData.teams.home.pitchers;
              // Tomar el primer pitcher como probable abridor
              if (homePitchers.length > 0) {
                const pitcher = homePitchers[0];
                const homePhotoUrl = await this.getPlayerPhoto(pitcher.person.id);
                confirmedPitchers.home = {
                  id: pitcher.person.id,
                  name: pitcher.person.fullName,
                  photo_url: homePhotoUrl
                };
              }
            }
            
            if (boxscoreData.teams.away && boxscoreData.teams.away.pitchers) {
              const awayPitchers = boxscoreData.teams.away.pitchers;
              // Tomar el primer pitcher como probable abridor
              if (awayPitchers.length > 0) {
                const pitcher = awayPitchers[0];
                const awayPhotoUrl = await this.getPlayerPhoto(pitcher.person.id);
                confirmedPitchers.away = {
                  id: pitcher.person.id,
                  name: pitcher.person.fullName,
                  photo_url: awayPhotoUrl
                };
              }
            }
          }
        } catch (boxscoreError) {
          console.log('❌ No se pudo obtener boxscore para pitchers confirmados:', boxscoreError.message);
        }
      }

      // Intentar obtener información del partido para determinar la fecha
      if (!confirmedPitchers.home && !confirmedPitchers.away) {
        try {
          console.log(`🔍 Intentando obtener información del partido para gameId: ${gameId}`);
          
          // Obtener información del partido desde la base de datos o API
          const { pool } = require('../config/database');
          const [gameInfo] = await pool.execute(
            'SELECT game_date FROM games WHERE mlb_id = ?',
            [gameId]
          );
          
          if (gameInfo.length > 0) {
            const gameDate = gameInfo[0].game_date;
            console.log(`📅 Fecha del partido: ${gameDate}`);
            
            // Intentar obtener del schedule con fecha específica
            const [year, month, day] = gameDate.split('-');
            const formattedDate = `${month}/${day}/${year}`;
            const dateScheduleData = await this.makeRequest(`/schedule?sportId=1&date=${formattedDate}`);
            
            if (dateScheduleData.dates && dateScheduleData.dates.length > 0) {
              const games = dateScheduleData.dates[0].games || [];
              const targetGame = games.find(g => g.gamePk === parseInt(gameId));
              
              if (targetGame && targetGame.probablePitchers) {
                console.log('✅ Pitchers encontrados en schedule por fecha:', targetGame.probablePitchers);
                
                if (targetGame.probablePitchers.home) {
                  const homePhotoUrl = await this.getPlayerPhoto(targetGame.probablePitchers.home.id);
                  confirmedPitchers.home = {
                    id: targetGame.probablePitchers.home.id,
                    name: targetGame.probablePitchers.home.fullName,
                    photo_url: homePhotoUrl
                  };
                }
                
                if (targetGame.probablePitchers.away) {
                  const awayPhotoUrl = await this.getPlayerPhoto(targetGame.probablePitchers.away.id);
                  confirmedPitchers.away = {
                    id: targetGame.probablePitchers.away.id,
                    name: targetGame.probablePitchers.away.fullName,
                    photo_url: awayPhotoUrl
                  };
                }
              }
            }
          }
        } catch (dateError) {
          console.log('❌ No se pudo obtener por fecha:', dateError.message);
        }
      }

      console.log('📊 Resultado final de pitchers confirmados:', confirmedPitchers);
      return confirmedPitchers;
    } catch (error) {
      console.error('Error obteniendo pitchers confirmados:', error);
      return { home: null, away: null };
    }
  }

  // Obtener estadísticas de bullpen de un equipo
  async getBullpenStats(teamId, season = new Date().getFullYear()) {
    try {
      const data = await this.makeRequest(`/teams/${teamId}/stats?stats=season&group=pitching&season=${season}`);
      
      if (!data.stats || data.stats.length === 0) {
        return null;
      }

      const stats = data.stats[0].splits[0].stat;
      return {
        era: parseFloat(stats.era) || 0,
        whip: parseFloat(stats.whip) || 0,
        strikeOuts: parseInt(stats.strikeOuts) || 0,
        baseOnBalls: parseInt(stats.baseOnBalls) || 0,
        homeRuns: parseInt(stats.homeRuns) || 0,
        saves: parseInt(stats.saves) || 0,
        holds: parseInt(stats.holds) || 0,
        blownSaves: parseInt(stats.blownSaves) || 0,
        inningsPitched: parseFloat(stats.inningsPitched) || 0
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de bullpen:', error);
      return null;
    }
  }

  // Obtener LOB% (Left On Base Percentage) del equipo
  async getTeamLOBPercentage(teamId, season = new Date().getFullYear()) {
    try {
      const data = await this.makeRequest(`/teams/${teamId}/stats?stats=season&group=pitching&season=${season}&fields=stats,group,type,splits,stat,leftOnBasePct`);
      
      if (!data.stats || data.stats.length === 0) {
        return null;
      }

      const stats = data.stats[0].splits[0].stat;
      return parseFloat(stats.leftOnBasePct) || 0;
    } catch (error) {
      console.error('Error obteniendo LOB% del equipo:', error);
      return null;
    }
  }

  // Obtener estadísticas de defensa de un equipo
  async getDefenseStats(teamId, season = new Date().getFullYear()) {
    try {
      const data = await this.makeRequest(`/teams/${teamId}/stats?stats=season&group=fielding&season=${season}`);
      
      if (!data.stats || data.stats.length === 0) {
        return null;
      }

      const stats = data.stats[0].splits[0].stat;
      return {
        fieldingPct: parseFloat(stats.fieldingPct) || 0,
        errors: parseInt(stats.errors) || 0,
        assists: parseInt(stats.assists) || 0,
        putOuts: parseInt(stats.putOuts) || 0,
        doublePlays: parseInt(stats.doublePlays) || 0,
        passedBalls: parseInt(stats.passedBalls) || 0
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de defensa:', error);
      return null;
    }
  }

  // Obtener DRS (Defensive Runs Saved) del equipo
  async getTeamDRS(teamId, season = new Date().getFullYear()) {
    try {
      const data = await this.makeRequest(`/teams/${teamId}/stats?stats=season&group=fielding&season=${season}&fields=stats,group,type,splits,stat,defensiveRunsSavedAboveAvg`);
      
      if (!data.stats || data.stats.length === 0) {
        return null;
      }

      const stats = data.stats[0].splits[0].stat;
      return parseFloat(stats.defensiveRunsSavedAboveAvg) || 0;
    } catch (error) {
      console.error('Error obteniendo DRS del equipo:', error);
      return 0; // Valor neutral si no se puede obtener
    }
  }

  // Obtener estadísticas avanzadas de un equipo (método mejorado)
  async getAdvancedStats(teamId, season = new Date().getFullYear()) {
    try {
      // Obtener múltiples estadísticas en paralelo
      const [battingData, wrcPlus, opsVsLHP, opsVsRHP, risp, lobPct, drs] = await Promise.all([
        this.makeRequest(`/teams/${teamId}/stats?stats=season&group=hitting&season=${season}`),
        this.getTeamWRCPlus(teamId, season),
        this.getTeamOPSvsLHP(teamId, season),
        this.getTeamOPSvsRHP(teamId, season),
        this.getTeamRISP(teamId, season),
        this.getTeamLOBPercentage(teamId, season),
        this.getTeamDRS(teamId, season)
      ]);
      
      if (!battingData.stats || battingData.stats.length === 0) {
        return null;
      }

      const battingStats = battingData.stats[0].splits[0].stat;
      
      // Calcular estadísticas avanzadas
      const games = parseInt(battingStats.games) || 1;
      const runs = parseInt(battingStats.runs) || 0;
      const hits = parseInt(battingStats.hits) || 0;
      const baseOnBalls = parseInt(battingStats.baseOnBalls) || 0;
      const strikeOuts = parseInt(battingStats.strikeOuts) || 0;
      const atBats = parseInt(battingStats.atBats) || 0;
      
      return {
        runsPerGame: games > 0 ? runs / games : 0,
        battingAvg: atBats > 0 ? hits / atBats : 0,
        walkRate: atBats > 0 ? baseOnBalls / atBats : 0,
        strikeoutRate: atBats > 0 ? strikeOuts / atBats : 0,
        ops: parseFloat(battingStats.ops) || 0,
        wrcPlus: wrcPlus,
        opsVsLHP: opsVsLHP,
        opsVsRHP: opsVsRHP,
        risp: risp,
        lobPercentage: lobPct,
        drs: drs
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas avanzadas:', error);
      return null;
    }
  }

  // Obtener roster de un equipo
  async getTeamRoster(teamId, season = new Date().getFullYear()) {
    try {
      const data = await this.makeRequest(`/teams/${teamId}/roster?season=${season}`);
      
      if (!data.roster || data.roster.length === 0) {
        return [];
      }

      return data.roster;
    } catch (error) {
      console.error('Error obteniendo roster del equipo:', error);
      return [];
    }
  }

  // Obtener información de un jugador específico
  async getPlayerInfo(playerId) {
    try {
      const data = await this.makeRequest(`/people/${playerId}`);
      
      if (!data.people || data.people.length === 0) {
        return null;
      }

      return data.people[0];
    } catch (error) {
      console.error('Error obteniendo información del jugador:', error);
      return null;
    }
  }

  // Obtener estadísticas de un pitcher (método simplificado y confiable)
  async getPitcherStats(personId, season = new Date().getFullYear()) {
    try {
      console.log(`🔍 Obteniendo stats para pitcher ${personId} temporada ${season}`);
      
      // Usar endpoint más confiable
      const data = await this.makeRequest(`/people/${personId}/stats?stats=season&group=pitching&season=${season}`);
      
      console.log(`📊 Respuesta de API para ${personId}:`, data);
      
      if (!data.stats || data.stats.length === 0) {
        console.log(`⚠️ No hay stats para pitcher ${personId}`);
        return {
          era: 0,
          whip: 0,
          k9: 0,
          games: 0,
          ip: 0,
          fip: 0,
          wins: 0,
          losses: 0,
          saves: 0,
          holds: 0,
          blownSaves: 0
        };
      }

      const stats = data.stats[0].splits[0].stat;
      console.log(`📈 Stats obtenidos para ${personId}:`, stats);
      
      // Calcular K/9
      const inningsPitched = parseFloat(stats.inningsPitched) || 0;
      const strikeOuts = parseInt(stats.strikeOuts) || 0;
      const k9 = inningsPitched > 0 ? (strikeOuts * 9) / inningsPitched : 0;
      
      // Calcular WHIP
      const hits = parseInt(stats.hits) || 0;
      const baseOnBalls = parseInt(stats.baseOnBalls) || 0;
      const whip = inningsPitched > 0 ? (hits + baseOnBalls) / inningsPitched : 0;
      
      // Calcular FIP si no está disponible
      let fip = parseFloat(stats.fip);
      if (!fip && inningsPitched > 0) {
        const homeRuns = parseInt(stats.homeRuns) || 0;
        const intentionalWalks = parseInt(stats.intentionalWalks) || 0;
        const hitBatsmen = parseInt(stats.hitBatsmen) || 0;
        
        fip = ((13 * homeRuns) + (3 * (baseOnBalls + hitBatsmen - intentionalWalks)) - (2 * strikeOuts)) / inningsPitched + 3.10;
      }
      
      const result = {
        era: parseFloat(stats.era) || 0,
        whip: whip > 0 ? parseFloat(whip.toFixed(2)) : 0,
        k9: k9 > 0 ? parseFloat(k9.toFixed(1)) : 0,
        games: parseInt(stats.games) || 0,
        ip: parseFloat(stats.inningsPitched) || 0,
        fip: fip ? parseFloat(fip.toFixed(2)) : 0,
        wins: parseInt(stats.wins) || 0,
        losses: parseInt(stats.losses) || 0,
        saves: parseInt(stats.saves) || 0,
        holds: parseInt(stats.holds) || 0,
        blownSaves: parseInt(stats.blownSaves) || 0
      };
      
      console.log(`✅ Stats finales para ${personId}:`, result);
      return result;
      
    } catch (error) {
      console.error(`❌ Error obteniendo estadísticas del pitcher ${personId}:`, error);
      return {
        era: 0,
        whip: 0,
        k9: 0,
        games: 0,
        ip: 0,
        fip: 0,
        wins: 0,
        losses: 0,
        saves: 0,
        holds: 0,
        blownSaves: 0
      };
    }
  }

  // Limpiar cache
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new MLBService();

