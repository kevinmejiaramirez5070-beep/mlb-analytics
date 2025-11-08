import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, Button, DatePicker, Alert, Space, Title, Text, Tag } from '../components/BasicUI';
import PitcherComparison from '../components/PitcherComparison';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [analyzing, setAnalyzing] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [filteredGames, setFilteredGames] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [gameToAnalyze, setGameToAnalyze] = useState(null);
  const intervalRef = useRef(null);

  const fetchGames = async (date) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/games/today?date=${date}`);
      setGames(response.data.data || []);
    } catch (error) {
      setError(error.response?.data?.error || 'Error al cargar los partidos');
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveStatus = async (date) => {
    try {
      const response = await axios.get(`/api/games/live-status/${date}`);
      if (response.data.success) {
        setGames(response.data.data);
        setLastUpdate(response.data.updated_at);
      }
    } catch (error) {
      console.error('Error fetching live status:', error);
    }
  };

  // Filtrar partidos por estado
  const filterGamesByStatus = (games, status) => {
    if (status === 'all') return games;
    return games.filter(game => game.status === status);
  };

  // Aplicar filtros cuando cambien los juegos o el filtro
  useEffect(() => {
    const filtered = filterGamesByStatus(games, statusFilter);
    setFilteredGames(filtered);
  }, [games, statusFilter]);

  const analyzeGame = async (mlbId) => {
    setAnalyzing(prev => ({ ...prev, [mlbId]: true }));
    try {
      await axios.post(`/api/games/analyze/${mlbId}`);
      // Recargar partidos para mostrar el estado actualizado
      await fetchGames(selectedDate);
      
      // Mostrar mensaje de confirmación
      alert('✅ ¡Análisis completado exitosamente!\n\nEl partido ha sido analizado y ahora puedes ver los resultados en el apartado de Análisis.');
      
      // Navegar automáticamente al apartado de análisis
      navigate('/analysis');
      
    } catch (error) {
      setError(error.response?.data?.error || 'Error al analizar el partido');
    } finally {
      setAnalyzing(prev => ({ ...prev, [mlbId]: false }));
    }
  };

  const handleAnalyzeClick = (game) => {
    console.log('🔍 handleAnalyzeClick llamado con:', game);
    // Analizar directamente sin preguntar
    analyzeGame(game.mlb_id);
  };

  // Estas funciones ya no se necesitan, pero las dejamos por si acaso
  const confirmAnalyze = () => {
    if (gameToAnalyze) {
      analyzeGame(gameToAnalyze.mlb_id);
    }
    setShowConfirmDialog(false);
    setGameToAnalyze(null);
  };

  const cancelAnalyze = () => {
    setShowConfirmDialog(false);
    setGameToAnalyze(null);
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    fetchGames(date);
  };

  useEffect(() => {
    fetchGames(selectedDate);
  }, []);

  // Actualización automática cada 30 segundos
  useEffect(() => {
    if (autoRefresh) {
      // Actualización inicial
      fetchLiveStatus(selectedDate);
      
      // Configurar intervalo de actualización
      intervalRef.current = setInterval(() => {
        fetchLiveStatus(selectedDate);
      }, 30000); // 30 segundos
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [autoRefresh, selectedDate]);

  const formatTime = (time) => {
    if (!time) return 'TBD';
    try {
      return new Date(`2000-01-01T${time}`).toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      return time;
    }
  };

  const getTeamAbbreviation = (name) => {
    const words = name.split(' ');
    if (words.length === 1) return name.substring(0, 2).toUpperCase();
    return words.map(word => word[0]).join('').toUpperCase();
  };

  const getStatusLabel = (status) => {
    const statusLabels = {
      'scheduled': 'Programado',
      'in progress': 'En Progreso',
      'final': 'Finalizado',
      'warmup': 'Calentamiento',
      'pre-game': 'Pre-Juego',
      'live': 'En Vivo',
      'delayed': 'Retrasado',
      'postponed': 'Aplazado',
      'cancelled': 'Cancelado',
      'suspended': 'Suspendido',
      '': 'Sin Estado'
    };
    return statusLabels[status] || status || 'Sin Estado';
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'scheduled': 'blue',
      'in progress': 'orange',
      'final': 'green',
      'warmup': 'yellow',
      'pre-game': 'blue',
      'live': 'orange',
      'delayed': 'yellow',
      'postponed': 'yellow',
      'cancelled': 'red',
      'suspended': 'purple',
      '': 'gray'
    };
    return statusColors[status] || 'gray';
  };

  return (
    <div className="home-page">
      <Title level={1}>Partidos del Día</Title>
      
      <Space direction="vertical" size="large">
        {/* Filtros */}
        <Card title="Filtros">
          <Space wrap>
            <div>
              <Text>Fecha:</Text>
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="basic-date-picker"
              />
            </div>
                                    <div>
                          <Text>Estado:</Text>
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="basic-select"
                          >
                            <option value="all">Todos los Estados</option>
                            <option value="scheduled">Programados</option>
                            <option value="pre-game">Pre-Juego</option>
                            <option value="warmup">Calentamiento</option>
                            <option value="live">En Vivo</option>
                            <option value="in progress">En Progreso</option>
                            <option value="final">Finalizados</option>
                            <option value="delayed">Retrasados</option>
                            <option value="postponed">Aplazados</option>
                            <option value="cancelled">Cancelados</option>
                            <option value="suspended">Suspendidos</option>
                            <option value="">Sin Estado</option>
                          </select>
                        </div>
                        <div>
                          <Text>Seleccionar Partido:</Text>
                          <select 
                            value={selectedGame ? selectedGame.mlb_id : ''} 
                            onChange={(e) => {
                              const selectedValue = e.target.value;
                              
                              if (selectedValue === '') {
                                setSelectedGame(null);
                                return;
                              }
                              
                              const game = filteredGames.find(g => String(g.mlb_id) === String(selectedValue));
                              setSelectedGame(game || null);
                            }}
                            className="basic-select"
                          >
                            <option value="">Selecciona un partido...</option>
                            {filteredGames.map((game) => (
                              <option key={game.mlb_id} value={game.mlb_id}>
                                {game.away_team_name} vs {game.home_team_name} - {formatTime(game.game_time)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Text>Actualización:</Text>
                          <label className="auto-refresh-toggle">
                            <input
                              type="checkbox"
                              checked={autoRefresh}
                              onChange={(e) => setAutoRefresh(e.target.checked)}
                            />
                            <span>Auto-refresh (30s)</span>
                          </label>
                        </div>
                        <div>
                          <Button
                            type="secondary"
                            onClick={() => fetchLiveStatus(selectedDate)}
                            className="refresh-button"
                          >
                            🔄 Actualizar Ahora
                          </Button>
                        </div>
                        {lastUpdate && (
                          <div>
                            <Text style={{ fontSize: '11px', color: '#666' }}>
                              Última actualización: {new Date(lastUpdate).toLocaleTimeString('es-ES')}
                            </Text>
                          </div>
                        )}

          </Space>
        </Card>

        {/* Mensajes de error */}
        {error && (
          <Alert type="error" message="Error" description={error} />
        )}

        {/* Diálogo de confirmación - REMOVIDO */}

        {/* Información sobre estados - OCULTO */}
        {/* <Card title="Información de Estados">
          <Text>
            <strong>Estados disponibles:</strong> Programados, En Progreso, Finalizados, etc.
          </Text>
          <Text style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
            Nota: Los datos se actualizan solo cuando presionas "Actualizar Ahora" o activas "Auto-refresh". 
            Esto evita hacer demasiadas peticiones a la API.
          </Text>
          {lastUpdate && (
            <Text style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
              Última actualización: {new Date(lastUpdate).toLocaleTimeString('es-ES')}
            </Text>
          )}
        </Card> */}

        {/* Selector de partido - OCULTO */}
        {/* <Card title="Seleccionar Partido">
          <div className="game-selector">
            <select 
              value={selectedGame ? selectedGame.mlb_id : ''} 
              onChange={(e) => {
                const game = filteredGames.find(g => g.mlb_id === e.target.value);
                setSelectedGame(game || null);
              }}
              className="game-select"
            >
              <option value="">Selecciona un partido...</option>
              {filteredGames.map((game) => (
                <option key={game.mlb_id} value={game.mlb_id}>
                  {game.away_team_name} vs {game.home_team_name} - {formatTime(game.game_time)}
                </option>
              ))}
            </select>
          </div>
        </Card> */}

        {/* Partido Seleccionado con Comparación de Pitchers */}
        {selectedGame ? (
          <Card title={`${selectedGame.away_team_name} vs ${selectedGame.home_team_name}`}>
            <div className="selected-game-info">
              <div className="game-details">
                <div className="game-time-display">
                  <strong>Hora:</strong> {formatTime(selectedGame.game_time)}
                </div>
                <div className="game-status-display">
                  <strong>Estado:</strong> 
                  <Tag color={getStatusColor(selectedGame.status)} style={{ marginLeft: '8px' }}>
                    {getStatusLabel(selectedGame.status)}
                  </Tag>
                </div>
                <div className="game-actions-display">
                  <Button
                    type="secondary"
                    onClick={() => setSelectedGame(null)}
                    size="small"
                  >
                    ← Volver a la lista
                  </Button>
                </div>
              </div>
              
              <PitcherComparison 
                game={selectedGame} 
                onAnalyze={analyzeGame}
                onAnalyzeClick={handleAnalyzeClick}
              />
            </div>
          </Card>
        ) : (
          /* <Card title="Comparación de Pitchers">
            <Text>
              Selecciona un partido arriba para ver la comparación de pitchers con estadísticas reales.
            </Text>
          </Card> */
          null
        )}

        {/* Solo mostrar la lista si no hay partido seleccionado */}
        {!selectedGame && (
          <Card title="Partidos Disponibles">
            <div className="games-list">
              {loading ? (
                <div className="loading">
                  <div className="spinner"></div>
                  <Text>Cargando partidos...</Text>
                </div>
              ) : filteredGames.length > 0 ? (
                <div className="games-grid">
                  {filteredGames.map((game) => (
                    <div 
                      key={game.id} 
                      className="game-item"
                      onClick={() => setSelectedGame(game)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="game-teams-compact">
                        <span>{game.away_team_name}</span>
                        <span className="vs-small">vs</span>
                        <span>{game.home_team_name}</span>
                      </div>
                      <div className="game-time-compact">
                        {formatTime(game.game_time)}
                      </div>
                      <div className="game-status-compact">
                        <Tag color={getStatusColor(game.status)}>
                          {getStatusLabel(game.status)}
                        </Tag>
                      </div>
                      <div className="game-actions-compact">
                        <Button
                          type={game.status === 'analyzed' ? 'success' : 'primary'}
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('🔍 Botón Analizar clickeado para:', game);
                            handleAnalyzeClick(game);
                          }}
                          loading={analyzing[game.mlb_id]}
                          disabled={game.status === 'analyzed'}
                          size="small"
                        >
                          {game.status === 'analyzed' ? '✓' : 'Analizar'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Text>
                  {statusFilter === 'all' 
                    ? 'No se encontraron partidos para la fecha seleccionada.'
                    : `No se encontraron partidos con estado "${getStatusLabel(statusFilter)}" para la fecha seleccionada.`
                  }
                </Text>
              )}
            </div>
          </Card>
        )}
      </Space>
    </div>
  );
};

export default Home;

