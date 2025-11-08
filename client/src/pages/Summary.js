import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Card, 
  Table, 
  Input, 
  Button, 
  Tag, 
  Title, 
  Text,
  Alert,
  Space,
  DatePicker
} from '../components/BasicUI';

const Summary = () => {
  const [analysis, setAnalysis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    date: '',
    level: '',
    minProbability: '',
    team: ''
  });
  const [availableTeams, setAvailableTeams] = useState([]);
  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.date) params.append('date', filters.date);
      if (filters.level) params.append('level', filters.level);
      if (filters.minProbability) params.append('minProbability', filters.minProbability);
      if (filters.team) params.append('team', filters.team);

      const response = await axios.get(`/api/games/summary?${params.toString()}`);
      setAnalysis(response.data.data || []);
      
      // Obtener equipos únicos para el desplegable
      const teams = [...new Set(response.data.data.map(a => [a.home_team_name, a.away_team_name]).flat())];
      setAvailableTeams(teams.sort());
    } catch (err) {
      setError('Error al cargar el resumen: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = () => {
    fetchAnalysis();
  };

  const handleClearFilters = () => {
    setFilters({
      date: '',
      level: '',
      minProbability: '',
      team: ''
    });
  };



  const getLevelColor = (level) => {
    switch (level) {
      case 'Diamond': return 'red';
      case 'Exclusive': return 'orange';
      case 'VIP': return 'blue';
      default: return 'default';
    }
  };

  // Función para determinar el resultado del partido
  const getGameResult = (record) => {
    // Mostrar resultado si hay scores disponibles (incluyendo 0), independientemente del status
    if (record.home_score !== null && record.away_score !== null && 
        record.home_score !== undefined && record.away_score !== undefined) {
      
      const homeWon = record.home_score > record.away_score;
      const isTie = record.home_score === record.away_score;
      
      if (isTie) {
        return {
          home: 'Empate',
          away: 'Empate',
          scores: `${record.away_score} - ${record.home_score}`
        };
      }
      
      return {
        home: homeWon ? 'Ganador' : 'Perdedor',
        away: homeWon ? 'Perdedor' : 'Ganador',
        scores: `${record.away_score} - ${record.home_score}`
      };
    }
    
    return { home: null, away: null, scores: null };
  };

  const columns = [
    {
      title: 'Fecha',
      dataIndex: 'game_date',
      render: (date, record) => (
        <div>
          <div>{new Date(date).toLocaleDateString('es-ES')}</div>
          <div style={{ 
            fontSize: '10px', 
            color: record.status === 'final' ? '#52c41a' : 
                   record.status === 'live' ? '#ff4d4f' : '#666',
            fontWeight: 'bold'
          }}>
            {record.status === 'final' ? 'Finalizado' : 
             record.status === 'live' ? 'En vivo' : 
             record.status === 'scheduled' ? 'Programado' : record.status}
          </div>
        </div>
      )
    },
    {
      title: 'Visitante',
      dataIndex: 'away_team_name',
      render: (text, record) => {
        const result = getGameResult(record);
        return (
          <div>
            <div>{text}</div>
            {result.away && (
              <div style={{ 
                fontSize: '12px', 
                color: result.away === 'Ganador' ? '#52c41a' : 
                       result.away === 'Perdedor' ? '#ff4d4f' : 
                       result.away === 'Empate' ? '#1890ff' : '#666',
                fontWeight: 'bold'
              }}>
                {result.away}
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: 'Local',
      dataIndex: 'home_team_name',
      render: (text, record) => {
        const result = getGameResult(record);
        return (
          <div>
            <div>{text}</div>
            {result.home && (
              <div style={{ 
                fontSize: '12px', 
                color: result.home === 'Ganador' ? '#52c41a' : 
                       result.home === 'Perdedor' ? '#ff4d4f' : 
                       result.home === 'Empate' ? '#1890ff' : '#666',
                fontWeight: 'bold'
              }}>
                {result.home}
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: 'Resultado',
      dataIndex: 'result',
      render: (text, record) => {
        const result = getGameResult(record);
        if (result.scores) {
          return (
            <div style={{ 
              fontSize: '14px', 
              fontWeight: 'bold',
              color: '#1890ff'
            }}>
              {result.scores}
            </div>
          );
        }
        return <span style={{ color: '#999' }}>-</span>;
      }
    },
    {
      title: 'Prob. Visitante',
      dataIndex: 'away_probability',
      render: (prob) => `${(prob * 100).toFixed(1)}%`
    },
    {
      title: 'Prob. Local',
      dataIndex: 'home_probability',
      render: (prob) => `${(prob * 100).toFixed(1)}%`
    },
    {
      title: 'Nivel',
      dataIndex: 'level',
      render: (level) => (
        <Tag color={getLevelColor(level)}>
          {level}
        </Tag>
      )
    }
  ];

  const stats = {
    total: analysis.length,
    diamond: analysis.filter(a => a.level === 'Diamond').length,
    exclusive: analysis.filter(a => a.level === 'Exclusive').length,
    vip: analysis.filter(a => a.level === 'VIP').length,
    withResults: analysis.filter(a => {
      const result = getGameResult(a);
      return result.scores !== null;
    }).length,
    won: analysis.filter(a => {
      const result = getGameResult(a);
      return result.scores !== null && (result.home === 'Ganador' || result.away === 'Ganador');
    }).length,
    lost: analysis.filter(a => {
      const result = getGameResult(a);
      return result.scores !== null && (result.home === 'Perdedor' || result.away === 'Perdedor');
    }).length,
    // Estadísticas específicas del equipo seleccionado
    selectedTeamStats: filters.team ? (() => {
      const teamGames = analysis.filter(a => 
        a.home_team_name === filters.team || a.away_team_name === filters.team
      );
      
      const teamWon = teamGames.filter(a => {
        const result = getGameResult(a);
        if (result.scores === null) return false;
        
        const isHomeTeam = a.home_team_name === filters.team;
        return isHomeTeam ? result.home === 'Ganador' : result.away === 'Ganador';
      }).length;
      
      const teamLost = teamGames.filter(a => {
        const result = getGameResult(a);
        if (result.scores === null) return false;
        
        const isHomeTeam = a.home_team_name === filters.team;
        return isHomeTeam ? result.home === 'Perdedor' : result.away === 'Perdedor';
      }).length;
      
      return { won: teamWon, lost: teamLost, total: teamGames.length };
    })() : null
  };

  return (
    <div className="summary-page">
      <Title level={1}>Resumen Avanzado</Title>
      
      <Space direction="vertical" size="large">
        <Card title="Filtros">
          <Space wrap>
            <div>
              <Text>Fecha:</Text>
              <DatePicker
                value={filters.date}
                onChange={(e) => handleFilterChange('date', e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </div>
            
            <div>
              <Text>Nivel:</Text>
              <select 
                value={filters.level} 
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="basic-input"
              >
                <option value="">Todos</option>
                <option value="Diamond">Diamond</option>
                <option value="Exclusive">Exclusive</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
            
            <div>
              <Text>Prob. Mínima (%):</Text>
              <Input
                type="number"
                value={filters.minProbability}
                onChange={(e) => handleFilterChange('minProbability', e.target.value)}
                placeholder="50"
                min="0"
                max="100"
              />
            </div>
            
            <div>
              <Text>Equipo:</Text>
              <select 
                value={filters.team} 
                onChange={(e) => handleFilterChange('team', e.target.value)}
                className="basic-input"
              >
                <option value="">Todos los equipos</option>
                {availableTeams.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>
            
            <Button type="primary" onClick={handleApplyFilters} loading={loading}>
              Aplicar
            </Button>
            
            <Button onClick={handleClearFilters}>
              Limpiar
            </Button>
          </Space>
        </Card>

        <Card title="Estadísticas">
          <Space wrap={true}>
            <div className="stat-item">
              <Text strong>Total: {stats.total}</Text>
            </div>
            <div className="stat-item">
              <Text strong>Diamond: {stats.diamond}</Text>
            </div>
            <div className="stat-item">
              <Text strong>Exclusive: {stats.exclusive}</Text>
            </div>
            <div className="stat-item">
              <Text strong>VIP: {stats.vip}</Text>
            </div>
            <div className="stat-item">
              <Text strong style={{ color: stats.withResults > 0 ? '#52c41a' : '#666' }}>
                Con Resultados: {stats.withResults}
              </Text>
            </div>
            
            {/* Estadísticas específicas del equipo seleccionado */}
            {stats.selectedTeamStats && (
              <>
                <div className="stat-item">
                  <Text strong style={{ color: '#1890ff' }}>
                    {filters.team}: {stats.selectedTeamStats.total} partidos
                  </Text>
                </div>
                <div className="stat-item">
                  <Text strong style={{ color: stats.selectedTeamStats.won > 0 ? '#52c41a' : '#666' }}>
                    Ganados: {stats.selectedTeamStats.won}
                  </Text>
                </div>
                <div className="stat-item">
                  <Text strong style={{ color: stats.selectedTeamStats.lost > 0 ? '#ff4d4f' : '#666' }}>
                    Perdidos: {stats.selectedTeamStats.lost}
                  </Text>
                </div>
              </>
            )}
          </Space>
        </Card>

        {error && (
          <Alert
            type="error"
            message="Error"
            description={error}
          />
        )}


        <Card title="Resultados Filtrados">
          <Table
            columns={columns}
            dataSource={analysis}
            loading={loading}
          />
        </Card>

        {analysis.length === 0 && !loading && (
          <Alert
            type="info"
            message="No hay resultados"
            description="No se encontraron análisis que coincidan con los filtros aplicados."
          />
        )}
      </Space>
    </div>
  );
};

export default Summary;

