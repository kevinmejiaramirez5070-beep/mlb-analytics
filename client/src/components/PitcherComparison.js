import React, { useState, useEffect } from 'react';
import './PitcherComparison.css';

const PitcherComparison = ({ game, onAnalyze, onAnalyzeClick }) => {
  const [homePitcher, setHomePitcher] = useState(null);
  const [awayPitcher, setAwayPitcher] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (game && game.mlb_id) {
      fetchPitchers();
    }
  }, [game?.mlb_id]);

  const fetchPitchers = async () => {
    try {
      setLoading(true);
      
      console.log(`🔍 Obteniendo pitchers confirmados para partido: ${game.mlb_id}`);
      
      // Obtener pitchers abridores confirmados para el partido específico
      const response = await fetch(`/api/pitchers/game/${game.mlb_id}/confirmed`);
      const data = await response.json();

      if (data.success) {
        // Si hay pitchers confirmados, usarlos
        if (data.data.home || data.data.away) {
          console.log('✅ Pitchers confirmados encontrados:', {
            home: data.data.home?.name || 'No encontrado',
            away: data.data.away?.name || 'No encontrado'
          });
          console.log('📸 URLs de fotos recibidas:', {
            home_photo_url: data.data.home?.photo_url || 'No disponible',
            away_photo_url: data.data.away?.photo_url || 'No disponible'
          });
          console.log('🔍 Datos completos de pitchers:', {
            home: data.data.home,
            away: data.data.away
          });
          console.log('🔍 Datos completos de pitchers:', data.data);
          setHomePitcher(data.data.home);
          setAwayPitcher(data.data.away);
        } else {
          // Si no hay pitchers confirmados, usar el método anterior como fallback
          console.log('⚠️ No se encontraron pitchers confirmados, usando fallback...');
      const [homeResponse, awayResponse] = await Promise.all([
        fetch(`/api/pitchers/team/internal/${game.home_team_id}`),
        fetch(`/api/pitchers/team/internal/${game.away_team_id}`)
      ]);

      const homeData = await homeResponse.json();
      const awayData = await awayResponse.json();

      if (homeData.success && awayData.success) {
            console.log('✅ Usando pitchers de fallback:', {
              home: homeData.data?.name || 'No encontrado',
              away: awayData.data?.name || 'No encontrado'
            });
        setHomePitcher(homeData.data);
        setAwayPitcher(awayData.data);
          } else {
            console.error('❌ Error en respuesta de pitchers fallback:', { homeData, awayData });
          }
        }
      } else {
        console.error('❌ Error obteniendo pitchers confirmados:', data.error);
        // Intentar con el método anterior como fallback
        const [homeResponse, awayResponse] = await Promise.all([
          fetch(`/api/pitchers/team/internal/${game.home_team_id}`),
          fetch(`/api/pitchers/team/internal/${game.away_team_id}`)
        ]);

        const homeData = await homeResponse.json();
        const awayData = await awayResponse.json();

        if (homeData.success && awayData.success) {
          console.log('✅ Usando pitchers de fallback por error:', {
            home: homeData.data?.name || 'No encontrado',
            away: awayData.data?.name || 'No encontrado'
          });
          setHomePitcher(homeData.data);
          setAwayPitcher(awayData.data);
        } else {
          console.error('❌ Error en respuesta de pitchers fallback:', { homeData, awayData });
        }
      }
    } catch (error) {
      console.error('❌ Error fetching pitchers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatColor = (stat, value, type) => {
    if (!value || value === 0) return 'white';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'white';

    switch (type) {
      case 'era':
        return numValue <= 3.00 ? '#4CAF50' : numValue <= 4.00 ? '#FF9800' : '#F44336';
      case 'whip':
        return numValue <= 1.10 ? '#4CAF50' : numValue <= 1.25 ? '#FF9800' : '#F44336';
      case 'k9':
        return numValue >= 9.0 ? '#4CAF50' : numValue >= 7.0 ? '#FF9800' : '#F44336';
      case 'wins':
        return numValue >= 15 ? '#4CAF50' : numValue >= 10 ? '#FF9800' : '#F44336';
      default:
        return '#FF9800';
    }
  };

  if (loading) {
    return (
      <div className="pitcher-comparison-loading">
        <div className="loading-spinner"></div>
        <p>Cargando estadísticas de pitchers...</p>
      </div>
    );
  }

  if (!homePitcher || !awayPitcher) {
    return (
      <div className="pitcher-comparison-error">
        <p>No se pudieron cargar las estadísticas de los pitchers abridores confirmados</p>
        <p className="error-note">
          <small>
            💡 Nota: Los pitchers abridores se confirman horas antes del partido. 
            Si no aparecen, es posible que aún no estén confirmados por la MLB.
          </small>
        </p>
        <p className="error-note">
          <small>
            🔍 Debug: Partido ID {game?.mlb_id} - Estado: {game?.status}
          </small>
        </p>
      </div>
    );
  }

  // Verificar si los pitchers mostrados son confirmados o fallback
  const isFallback = homePitcher?.name === 'Caleb Boushley' || awayPitcher?.name === 'Andrew Chafin' ||
                     homePitcher?.name === 'Aaron Ashby' || awayPitcher?.name === 'Andrew Saalfrank';

  if (isFallback) {
    return (
      <div className="pitcher-comparison">
        <div className="pitcher-cards">
          {/* Pitcher Local */}
          <div className="pitcher-card home-pitcher">
            <div className="pitcher-header">
              <div className="pitcher-photo">
                <img 
                  src={homePitcher.id ? `/api/pitchers/proxy-photo/${homePitcher.id}` : '/api/pitchers/photo/default'} 
                  alt={homePitcher.name}
                  onError={(e) => {
                    console.log('❌ Error cargando foto de pitcher local:', homePitcher.id);
                    e.target.src = '/api/pitchers/photo/default';
                  }}
                  onLoad={(e) => {
                    console.log('✅ Foto de pitcher local cargada correctamente:', homePitcher.id);
                  }}
                />
              </div>
              <div className="pitcher-name">{homePitcher.name}</div>
              <div className="pitcher-status">⚠️ Pitcher del Roster (No Confirmado)</div>
            </div>
            
            <div className="pitcher-stats">
              <div className="stat-row">
                <span className="stat-label">ERA:</span>
                <span className="stat-value" style={{color: getStatColor('era', homePitcher.era, 'era')}}>
                  {homePitcher.era || '0'}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">WHIP:</span>
                <span className="stat-value" style={{color: getStatColor('whip', homePitcher.whip, 'whip')}}>
                  {homePitcher.whip || '0'}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">K/9:</span>
                <span className="stat-value" style={{color: getStatColor('k9', homePitcher.k9, 'k9')}}>
                  {homePitcher.k9 || '0'}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">G:</span>
                <span className="stat-value" style={{color: getStatColor('games', homePitcher.games, 'games')}}>
                  {homePitcher.games || '0'}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">IP:</span>
                <span className="stat-value" style={{color: getStatColor('ip', homePitcher.ip, 'ip')}}>
                  {homePitcher.ip || '0'}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">FIP:</span>
                <span className="stat-value" style={{color: getStatColor('fip', homePitcher.fip, 'fip')}}>
                  {homePitcher.fip || '0'}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">W-L:</span>
                <span className="stat-value" style={{color: getStatColor('wins', homePitcher.wins, 'wins')}}>
                  {homePitcher.wins || '0'}-{homePitcher.losses || '0'}
                </span>
              </div>
            </div>
          </div>

          {/* VS Indicator */}
          <div className="vs-indicator">
            <div className="vs-circle">VS</div>
          </div>

          {/* Pitcher Visitante */}
          <div className="pitcher-card away-pitcher">
            <div className="pitcher-header">
              <div className="pitcher-photo">
                <img 
                  src={awayPitcher.id ? `/api/pitchers/proxy-photo/${awayPitcher.id}` : '/api/pitchers/photo/default'} 
                  alt={awayPitcher.name}
                  onError={(e) => {
                    console.log('❌ Error cargando foto de pitcher visitante:', awayPitcher.id);
                    e.target.src = '/api/pitchers/photo/default';
                  }}
                  onLoad={(e) => {
                    console.log('✅ Foto de pitcher visitante cargada correctamente:', awayPitcher.id);
                  }}
                />
              </div>
              <div className="pitcher-name">{awayPitcher.name}</div>
              <div className="pitcher-status">⚠️ Pitcher del Roster (No Confirmado)</div>
            </div>
            
            <div className="pitcher-stats">
              <div className="stat-row">
                <span className="stat-label">ERA:</span>
                <span className="stat-value" style={{color: getStatColor('era', awayPitcher.era, 'era')}}>
                  {awayPitcher.era || '0'}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">WHIP:</span>
                <span className="stat-value" style={{color: getStatColor('whip', awayPitcher.whip, 'whip')}}>
                  {awayPitcher.whip || '0'}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">K/9:</span>
                <span className="stat-value" style={{color: getStatColor('k9', awayPitcher.k9, 'k9')}}>
                  {awayPitcher.k9 || '0'}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">G:</span>
                <span className="stat-value" style={{color: getStatColor('games', awayPitcher.games, 'games')}}>
                  {awayPitcher.games || '0'}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">IP:</span>
                <span className="stat-value" style={{color: getStatColor('ip', awayPitcher.ip, 'ip')}}>
                  {awayPitcher.ip || '0'}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">FIP:</span>
                <span className="stat-value" style={{color: getStatColor('fip', awayPitcher.fip, 'fip')}}>
                  {awayPitcher.fip || '0'}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">W-L:</span>
                <span className="stat-value" style={{color: getStatColor('wins', awayPitcher.wins, 'wins')}}>
                  {awayPitcher.wins || '0'}-{awayPitcher.losses || '0'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="fallback-notice">
          <p>⚠️ <strong>Pitchers del Roster Mostrados</strong></p>
          <p>Los pitchers abridores confirmados aún no están disponibles para este partido.</p>
          <p>La MLB confirma los pitchers abridores horas antes del partido.</p>
        </div>

        <div className="analyze-button-container">
          <button className="analyze-button" onClick={() => onAnalyzeClick ? onAnalyzeClick(game) : onAnalyze(game.mlb_id)}>
            <span className="analyze-icon">📊</span>
            Analizar Partido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pitcher-comparison">
      <div className="pitcher-cards">
        {/* Pitcher Local */}
        <div className="pitcher-card home-pitcher">
          <div className="pitcher-header">
            <div className="pitcher-photo">
              <img 
                src={homePitcher.id ? `/api/pitchers/real-photo/${homePitcher.id}` : "/api/pitchers/photo/default"}
                alt={homePitcher.name}
                onError={(e) => {
                  console.log('❌ Error cargando foto de pitcher local:', homePitcher.id, 'URL:', e.target.src);
                  e.target.src = "/api/pitchers/photo/default";
                }}
                onLoad={(e) => {
                  console.log('✅ Foto de pitcher local cargada:', homePitcher.id);
                }}
              />
            </div>
            <div className="pitcher-name">{homePitcher.name}</div>
          </div>
          
          <div className="pitcher-stats">
            <div className="stat-row">
              <span className="stat-label">ERA:</span>
              <span className="stat-value" style={{color: getStatColor('era', homePitcher.era, 'era')}}>
                {homePitcher.era || 'N/A'}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">WHIP:</span>
              <span className="stat-value" style={{color: getStatColor('whip', homePitcher.whip, 'whip')}}>
                {homePitcher.whip || 'N/A'}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">K/9:</span>
              <span className="stat-value" style={{color: getStatColor('k9', homePitcher.k9, 'k9')}}>
                {homePitcher.k9 || 'N/A'}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">G:</span>
              <span className="stat-value" style={{color: getStatColor('games', homePitcher.games, 'games')}}>
                {homePitcher.games || 'N/A'}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">IP:</span>
              <span className="stat-value" style={{color: getStatColor('ip', homePitcher.ip, 'ip')}}>
                {homePitcher.ip || 'N/A'}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">FIP:</span>
              <span className="stat-value" style={{color: getStatColor('fip', homePitcher.fip, 'fip')}}>
                {homePitcher.fip || 'N/A'}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">W-L:</span>
              <span className="stat-value" style={{color: getStatColor('wins', homePitcher.wins, 'wins')}}>
                {homePitcher.wins}-{homePitcher.losses || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* VS Indicator */}
        <div className="vs-indicator">
          <div className="vs-circle">VS</div>
        </div>

        {/* Pitcher Visitante */}
        <div className="pitcher-card away-pitcher">
          <div className="pitcher-header">
            <div className="pitcher-photo">
              <img 
                src={awayPitcher.id ? `/api/pitchers/real-photo/${awayPitcher.id}` : "/api/pitchers/photo/default"}
                alt={awayPitcher.name}
                onError={(e) => {
                  console.log('❌ Error cargando foto de pitcher visitante:', awayPitcher.id, 'URL:', e.target.src);
                  e.target.src = "/api/pitchers/photo/default";
                }}
                onLoad={(e) => {
                  console.log('✅ Foto de pitcher visitante cargada:', awayPitcher.id);
                }}
              />
            </div>
            <div className="pitcher-name">{awayPitcher.name}</div>
          </div>
          
          <div className="pitcher-stats">
            <div className="stat-row">
              <span className="stat-label">ERA:</span>
              <span className="stat-value" style={{color: getStatColor('era', awayPitcher.era, 'era')}}>
                {awayPitcher.era || 'N/A'}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">WHIP:</span>
              <span className="stat-value" style={{color: getStatColor('whip', awayPitcher.whip, 'whip')}}>
                {awayPitcher.whip || 'N/A'}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">K/9:</span>
              <span className="stat-value" style={{color: getStatColor('k9', awayPitcher.k9, 'k9')}}>
                {awayPitcher.k9 || 'N/A'}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">G:</span>
              <span className="stat-value" style={{color: getStatColor('games', awayPitcher.games, 'games')}}>
                {awayPitcher.games || 'N/A'}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">IP:</span>
              <span className="stat-value" style={{color: getStatColor('ip', awayPitcher.ip, 'ip')}}>
                {awayPitcher.ip || 'N/A'}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">FIP:</span>
              <span className="stat-value" style={{color: getStatColor('fip', awayPitcher.fip, 'fip')}}>
                {awayPitcher.fip || 'N/A'}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">W-L:</span>
              <span className="stat-value" style={{color: getStatColor('wins', awayPitcher.wins, 'wins')}}>
                {awayPitcher.wins}-{awayPitcher.losses || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="analyze-button-container">
        <button className="analyze-button" onClick={() => onAnalyzeClick ? onAnalyzeClick(game) : onAnalyze(game.mlb_id)}>
          <span className="analyze-icon">📊</span>
          Analizar Partido
        </button>
      </div>
    </div>
  );
};

export default PitcherComparison;
