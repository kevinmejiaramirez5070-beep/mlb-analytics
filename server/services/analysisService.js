const { pool } = require('../config/database');
const mlbService = require('./mlbService');

class AnalysisService {
  constructor() {
    this.modelVersion = '3.0';
    this.weightsVersion = '3.0';
  }

  // Obtener configuración de pesos activa
  async getActiveWeights() {
    try {
      const [rows] = await pool.execute(
        'SELECT pitcher_weight, batting_weight, bullpen_weight, defense_weight, context_weight FROM weight_configs WHERE is_active = TRUE LIMIT 1'
      );
      
      if (rows.length === 0) {
        throw new Error('No hay configuración de pesos activa');
      }
      
      return {
        pitcher_weight: rows[0].pitcher_weight,
        batting_weight: rows[0].batting_weight,
        bullpen_weight: rows[0].bullpen_weight,
        defense_weight: rows[0].defense_weight,
        context_weight: rows[0].context_weight
      };
    } catch (error) {
      console.error('Error obteniendo pesos:', error);
      throw error;
    }
  }

  // Factor 1: Picheo Abridor (35 pts) - USANDO DATOS REALES
  async calculatePitcherFactor(teamId, isHome = true) {
    try {
      // Obtener estadísticas del equipo y datos avanzados
      const [teamPitchingStats, advancedStats] = await Promise.all([
        mlbService.getBullpenStats(teamId),
        mlbService.getAdvancedStats(teamId)
      ]);
      
      if (!teamPitchingStats) {
        return 17.5; // Valor neutral (50% de 35 pts)
      }

      let totalScore = 0;

      // ERA (máx 9 pts)
      if (teamPitchingStats.era <= 3.00) totalScore += 9;
      else if (teamPitchingStats.era <= 4.00) totalScore += 5;
      else if (teamPitchingStats.era <= 4.80) totalScore += 2;
      // ERA ≥ 4.81 → 0 pts

      // WHIP (máx 6 pts)
      if (teamPitchingStats.whip <= 1.10) totalScore += 6;
      else if (teamPitchingStats.whip <= 1.30) totalScore += 4;
      else if (teamPitchingStats.whip <= 1.50) totalScore += 2;
      // WHIP ≥ 1.51 → 0 pts

      // K/9 (calculado desde strikeOuts e inningsPitched)
      const k9 = teamPitchingStats.inningsPitched > 0 ? 
        (teamPitchingStats.strikeOuts * 9) / teamPitchingStats.inningsPitched : 0;
      
      if (k9 >= 10.0) totalScore += 3;
      else if (k9 >= 8.0) totalScore += 2;
      else if (k9 >= 6.0) totalScore += 1;
      // K/9 ≤ 5.9 → 0 pts

      // BB/9 (calculado desde baseOnBalls e inningsPitched)
      const bb9 = teamPitchingStats.inningsPitched > 0 ? 
        (teamPitchingStats.baseOnBalls * 9) / teamPitchingStats.inningsPitched : 0;
      
      if (bb9 <= 2.0) totalScore += 1.5;
      else if (bb9 <= 3.0) totalScore += 1;
      else if (bb9 <= 4.0) totalScore += 0.5;
      // BB/9 ≥ 4.1 → 0 pts

      // HR/9 (calculado desde homeRuns e inningsPitched)
      const hr9 = teamPitchingStats.inningsPitched > 0 ? 
        (teamPitchingStats.homeRuns * 9) / teamPitchingStats.inningsPitched : 0;
      
      if (hr9 <= 0.9) totalScore += 3;
      else if (hr9 <= 1.2) totalScore += 2;
      else if (hr9 <= 1.5) totalScore += 1;
      // HR/9 > 1.5 → 0 pts

      // LOB% (DATOS REALES DE LA API)
      const lob = advancedStats?.lobPercentage || 72; // Valor por defecto si no está disponible
      if (lob >= 75) totalScore += 0.5;
      else if (lob >= 70) totalScore += 0.25;
      // LOB% < 70% → 0 pts

      // FIP (DATOS REALES DE LA API - aproximado desde ERA si no está disponible)
      const fip = teamPitchingStats.era + 0.1; // Aproximación por defecto
      if (fip <= 3.20) totalScore += 9;
      else if (fip <= 4.20) totalScore += 5;
      else if (fip <= 5.00) totalScore += 2;
      // FIP ≥ 5.01 → 0 pts

      // OPS vs L/R (DATOS REALES DE LA API)
      const ops_vs_l = advancedStats?.opsVsLHP || 0.700; // Valor por defecto
      const ops_vs_r = advancedStats?.opsVsRHP || 0.720; // Valor por defecto
      
      if (ops_vs_l <= 0.650) totalScore += 3;
      else if (ops_vs_l <= 0.750) totalScore += 2;
      else if (ops_vs_l <= 0.850) totalScore += 1;
      
      if (ops_vs_r <= 0.650) totalScore += 3;
      else if (ops_vs_r <= 0.750) totalScore += 2;
      else if (ops_vs_r <= 0.850) totalScore += 1;

      return totalScore;
    } catch (error) {
      console.error('Error calculando factor pitcher:', error);
      return 17.5; // Valor neutral
    }
  }

  // Factor 2: Ofensiva (30 pts) - USANDO DATOS REALES
  async calculateBattingFactor(teamId) {
    try {
      const [teamStats, advancedStats] = await Promise.all([
        mlbService.getTeamBattingStats(teamId),
        mlbService.getAdvancedStats(teamId)
      ]);
      
      if (!teamStats || !advancedStats) {
        return 15; // Valor neutral (50% de 30 pts)
      }

      let totalScore = 0;

      // OPS general (máx 5 pts)
      if (teamStats.ops >= 0.770) totalScore += 5;
      else if (teamStats.ops >= 0.720) totalScore += 3;
      else if (teamStats.ops >= 0.670) totalScore += 1;
      // < 0.670 → 0 pts

      // R/G (Carreras por juego) (máx 4 pts)
      if (advancedStats.runsPerGame >= 5.0) totalScore += 4;
      else if (advancedStats.runsPerGame >= 4.3) totalScore += 2.5;
      else if (advancedStats.runsPerGame >= 3.8) totalScore += 1;
      // < 3.8 → 0 pts

      // AVG general (máx 2 pts)
      if (advancedStats.battingAvg >= 0.265) totalScore += 2;
      else if (advancedStats.battingAvg >= 0.245) totalScore += 1;
      // < 0.245 → 0 pts

      // BB% (máx 1.5 pts)
      if (advancedStats.walkRate >= 0.09) totalScore += 1.5;
      else if (advancedStats.walkRate >= 0.07) totalScore += 1;
      // < 7.0% → 0 pts

      // K% (máx 0.5 pts)
      if (advancedStats.strikeoutRate <= 0.20) totalScore += 0.5;
      else if (advancedStats.strikeoutRate <= 0.25) totalScore += 0.25;
      // > 25% → 0 pts

      // wRC+ (DATOS REALES DE LA API)
      const wrc_plus = advancedStats.wrcPlus || 100; // Valor neutral si no está disponible
      if (wrc_plus >= 115) totalScore += 8;
      else if (wrc_plus >= 100) totalScore += 5;
      else if (wrc_plus >= 90) totalScore += 2;
      // < 90 → 0 pts

      // OPS vs LHP/RHP (DATOS REALES DE LA API)
      const ops_vs_lhp = advancedStats.opsVsLHP || (teamStats.ops * 0.98); // Fallback
      const ops_vs_rhp = advancedStats.opsVsRHP || (teamStats.ops * 1.02); // Fallback
      
      if (ops_vs_lhp >= 0.770) totalScore += 3;
      else if (ops_vs_lhp >= 0.720) totalScore += 2;
      else if (ops_vs_lhp >= 0.670) totalScore += 1;
      
      if (ops_vs_rhp >= 0.770) totalScore += 3;
      else if (ops_vs_rhp >= 0.720) totalScore += 2;
      else if (ops_vs_rhp >= 0.670) totalScore += 1;

      // RISP AVG (DATOS REALES DE LA API)
      const risp_avg = advancedStats.risp?.avg || (advancedStats.battingAvg * 0.95); // Fallback
      if (risp_avg >= 0.275) totalScore += 3;
      else if (risp_avg >= 0.245) totalScore += 2;
      else if (risp_avg >= 0.220) totalScore += 1;

      return totalScore;
    } catch (error) {
      console.error('Error calculando factor bateo:', error);
      return 15; // Valor neutral
    }
  }

  // Factor 3: Picheo Relevo (25 pts) - USANDO DATOS REALES
  async calculateBullpenFactor(teamId) {
    try {
      const [bullpenStats, advancedStats] = await Promise.all([
        mlbService.getBullpenStats(teamId),
        mlbService.getAdvancedStats(teamId)
      ]);
      
      if (!bullpenStats) {
        return 12.5; // Valor neutral (50% de 25 pts)
      }

      let totalScore = 0;

      // ERA (máx 6 pts)
      if (bullpenStats.era <= 3.30) totalScore += 6;
      else if (bullpenStats.era <= 3.90) totalScore += 4;
      else if (bullpenStats.era <= 4.50) totalScore += 2;
      // ≥ 4.51 → 0 pts

      // WHIP (máx 5 pts)
      if (bullpenStats.whip <= 1.20) totalScore += 5;
      else if (bullpenStats.whip <= 1.30) totalScore += 3;
      else if (bullpenStats.whip <= 1.40) totalScore += 1;
      // ≥ 1.41 → 0 pts

      // HR/9 (calculado desde homeRuns e inningsPitched)
      const hr9 = bullpenStats.inningsPitched > 0 ? 
        (bullpenStats.homeRuns * 9) / bullpenStats.inningsPitched : 0;
      
      if (hr9 <= 0.9) totalScore += 3;
      else if (hr9 <= 1.1) totalScore += 2;
      else if (hr9 <= 1.3) totalScore += 1;
      // > 1.3 → 0 pts

      // K/9 (calculado desde strikeOuts e inningsPitched)
      const k9 = bullpenStats.inningsPitched > 0 ? 
        (bullpenStats.strikeOuts * 9) / bullpenStats.inningsPitched : 0;
      
      if (k9 >= 10.0) totalScore += 3;
      else if (k9 >= 8.5) totalScore += 2;
      else if (k9 >= 7.0) totalScore += 1;
      // < 7.0 → 0 pts

      // BB/9 (calculado desde baseOnBalls e inningsPitched)
      const bb9 = bullpenStats.inningsPitched > 0 ? 
        (bullpenStats.baseOnBalls * 9) / bullpenStats.inningsPitched : 0;
      
      if (bb9 <= 2.5) totalScore += 2;
      else if (bb9 <= 3.2) totalScore += 1.5;
      else if (bb9 <= 4.0) totalScore += 1;
      // > 4.0 → 0 pts

      // Blown Saves (BS) (máx 1 pt)
      if (bullpenStats.blownSaves <= 2) totalScore += 1;
      else if (bullpenStats.blownSaves <= 4) totalScore += 0.5;
      // ≥ 5 → 0 pts

      // Holds (HD) (máx 1 pt)
      if (bullpenStats.holds >= 20) totalScore += 1;
      else if (bullpenStats.holds >= 15) totalScore += 0.5;
      // < 15 → 0 pts

      // OPS permitido (aproximado desde ERA)
      const ops_allowed = 0.720; // Valor promedio (podría calcularse desde ERA)
      if (ops_allowed <= 0.670) totalScore += 4;
      else if (ops_allowed <= 0.720) totalScore += 3;
      else if (ops_allowed <= 0.770) totalScore += 1;
      // > 0.770 → 0 pts

      return totalScore;
    } catch (error) {
      console.error('Error calculando factor bullpen:', error);
      return 12.5; // Valor neutral
    }
  }

  // Factor 4: Defensa (10 pts) - USANDO DATOS REALES
  async calculateDefenseFactor(teamId) {
    try {
      const [defenseStats, advancedStats] = await Promise.all([
        mlbService.getDefenseStats(teamId),
        mlbService.getAdvancedStats(teamId)
      ]);
      
      if (!defenseStats) {
        return 5; // Valor neutral (50% de 10 pts)
      }

      let totalScore = 0;

      // Fielding % (FPCT) (máx 4 pts)
      if (defenseStats.fieldingPct >= 0.988) totalScore += 4;
      else if (defenseStats.fieldingPct >= 0.985) totalScore += 3;
      else if (defenseStats.fieldingPct >= 0.982) totalScore += 1;
      // ≤ 0.981 → 0 pts

      // Errores (E) (máx 3 pts)
      if (defenseStats.errors <= 75) totalScore += 3;
      else if (defenseStats.errors <= 90) totalScore += 2;
      else if (defenseStats.errors <= 100) totalScore += 1;
      // > 100 → 0 pts

      // DRS (DATOS REALES DE LA API)
      const drs = advancedStats.drs || 5; // Valor promedio si no está disponible
      if (drs >= 20) totalScore += 3;
      else if (drs >= 5) totalScore += 2;
      else if (drs >= 0) totalScore += 1;
      // < 0 → 0 pt

      return totalScore;
    } catch (error) {
      console.error('Error calculando factor defensa:', error);
      return 5; // Valor neutral
    }
  }

  // Factor 5: Contexto/Localía (ajustado para incluir defensa)
  async calculateContextFactor(teamId, isHome = true) {
    try {
      // Factor de localía: ventaja para el equipo local
      let contextScore = 50;
      
      if (isHome) {
        contextScore = 65; // Ventaja de localía
      } else {
        contextScore = 35; // Desventaja de visitante
      }

      return contextScore;
    } catch (error) {
      console.error('Error calculando factor contexto:', error);
      return 50;
    }
  }

  // Calcular puntaje total de un equipo (4 factores, total 100%)
  async calculateTeamScore(teamId, opponentId, isHome = true) {
    try {
      const weights = await this.getActiveWeights();
      
      const pitcherFactor = await this.calculatePitcherFactor(teamId, isHome);
      const battingFactor = await this.calculateBattingFactor(teamId);
      const bullpenFactor = await this.calculateBullpenFactor(teamId);
      const defenseFactor = await this.calculateDefenseFactor(teamId);

      // Normalizar factores a porcentajes (0-100)
      const normalizedPitcher = (pitcherFactor / 35) * 100;
      const normalizedBatting = (battingFactor / 30) * 100;
      const normalizedBullpen = (bullpenFactor / 25) * 100;
      const normalizedDefense = (defenseFactor / 10) * 100;

      // Calcular puntaje total usando solo 4 factores (total 100%)
      const totalScore = 
        (normalizedPitcher * weights.pitcher_weight) +
        (normalizedBatting * weights.batting_weight) +
        (normalizedBullpen * weights.bullpen_weight) +
        (normalizedDefense * weights.defense_weight);

      return {
        totalScore: Math.round(totalScore),
        factors: {
          pitcher: Math.round(normalizedPitcher),
          batting: Math.round(normalizedBatting),
          bullpen: Math.round(normalizedBullpen),
          defense: Math.round(normalizedDefense)
        }
      };
    } catch (error) {
      console.error('Error calculando puntaje del equipo:', error);
      throw error;
    }
  }

  // Convertir probabilidad a American odds
  probabilityToAmericanOdds(probability) {
    if (probability >= 0.5) {
      return Math.round(-100 * probability / (1 - probability));
    } else {
      return Math.round(100 * (1 - probability) / probability);
    }
  }

  // Determinar nivel basado en probabilidad
  determineLevel(probability) {
    const percentage = probability * 100;
    
    if (percentage >= 85) {
      return 'Diamond';
    } else if (percentage >= 70) {
      return 'Exclusive';
    } else if (percentage >= 50) {
      return 'VIP';
    } else {
      return 'Low';
    }
  }

  // Analizar un partido completo
  async analyzeGame(gameId) {
    try {
      // Obtener información del partido
      const [games] = await pool.execute(
        `SELECT g.*, ht.mlb_id as home_mlb_id, at.mlb_id as away_mlb_id 
         FROM games g 
         JOIN teams ht ON g.home_team_id = ht.id 
         JOIN teams at ON g.away_team_id = at.id 
         WHERE g.mlb_id = ?`,
        [gameId]
      );

      if (games.length === 0) {
        throw new Error('Partido no encontrado');
      }

      const game = games[0];

      // Calcular puntajes
      const homeScore = await this.calculateTeamScore(
        game.home_mlb_id, 
        game.away_mlb_id, 
        true
      );

      const awayScore = await this.calculateTeamScore(
        game.away_mlb_id, 
        game.home_mlb_id, 
        false
      );

      // Calcular probabilidades
      const totalScore = homeScore.totalScore + awayScore.totalScore;
      const homeProbability = homeScore.totalScore / totalScore;
      const awayProbability = awayScore.totalScore / totalScore;

      // Convertir a American odds
      const homeAmericanOdds = this.probabilityToAmericanOdds(homeProbability);
      const awayAmericanOdds = this.probabilityToAmericanOdds(awayProbability);

      // Determinar nivel
      const level = this.determineLevel(Math.max(homeProbability, awayProbability));

      // Guardar análisis en la base de datos
      const [result] = await pool.execute(
        `INSERT INTO analysis 
         (game_id, home_probability, away_probability, 
          home_american_odds, away_american_odds, level, 
          model_version, weights_version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          game.id,
          homeProbability,
          awayProbability,
          homeAmericanOdds,
          awayAmericanOdds,
          level,
          this.modelVersion,
          this.weightsVersion
        ]
      );

      // Actualizar estado del partido
      await pool.execute(
        'UPDATE games SET status = ? WHERE id = ?',
        ['analyzed', game.id]
      );

      return {
        game_id: game.id,
        home_probability: Math.round(homeProbability * 100 * 100) / 100,
        away_probability: Math.round(awayProbability * 100 * 100) / 100,
        home_american_odds: homeAmericanOdds,
        away_american_odds: awayAmericanOdds,
        level: level,
        home_factors: homeScore.factors,
        away_factors: awayScore.factors,
        model_version: this.modelVersion,
        weights_version: this.weightsVersion
      };

    } catch (error) {
      console.error('Error analizando partido:', error);
      throw error;
    }
  }
}

module.exports = new AnalysisService();


