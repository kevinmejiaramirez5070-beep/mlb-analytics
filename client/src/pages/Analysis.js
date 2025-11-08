import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Card, 
  Table, 
  Tag, 
  Title, 
  Text,
  Alert,
  Space,
  Input,
  Button,
  DatePicker
} from '../components/BasicUI';

const Analysis = () => {
  const [analysis, setAnalysis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchAnalysis = async (date = null) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (date) {
        params.append('date', date);
      }
      
      const response = await axios.get(`/api/games/summary?${params.toString()}`);
      setAnalysis(response.data.data || []);
    } catch (err) {
      setError('Error al cargar el análisis: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis(selectedDate);
  }, [selectedDate]);

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
  };

  const handleClearFilter = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
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
          away: 'Empate'
        };
      }
      
      return {
        home: homeWon ? 'Ganador' : 'Perdedor',
        away: homeWon ? 'Perdedor' : 'Ganador'
      };
    }
    
    return { home: null, away: null };
  };

  const columns = [
    {
      title: 'Fecha',
      dataIndex: 'game_date',
      render: (date) => new Date(date).toLocaleDateString('es-ES')
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
                       result.away === 'Perdedor' ? '#ff4d4f' : '#1890ff',
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
                       result.home === 'Perdedor' ? '#ff4d4f' : '#1890ff',
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

  return (
    <div className="analysis-page">
      <Title level={1}>Análisis de Partidos</Title>
      
      <Space direction="vertical" size="large">
        {error && (
          <Alert
            type="error"
            message="Error"
            description={error}
          />
        )}

        {/* Filtro de fecha */}
        <Card title="Filtros">
          <Space direction="horizontal" size="middle">
            <div>
              <Text strong>Filtrar por fecha:</Text>
              <Input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                placeholder="Seleccionar fecha"
                style={{ width: 200, marginLeft: 8 }}
              />
            </div>
            <Button onClick={handleClearFilter} type="default">
              Fecha Actual
            </Button>
          </Space>
          {selectedDate && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Mostrando análisis para: {new Date(selectedDate).toLocaleDateString('es-ES')}
              </Text>
            </div>
          )}
        </Card>

        <Card title="Resultados del Análisis">
          <Table
            columns={columns}
            dataSource={analysis}
            loading={loading}
          />
        </Card>

        {analysis.length === 0 && !loading && (
          <Alert
            type="info"
            message="No hay análisis disponibles para esta fecha"
            description="No se encontraron análisis para la fecha seleccionada. Intenta con otra fecha o analiza algunos partidos desde la página de inicio."
          />
        )}
      </Space>
    </div>
  );
};

export default Analysis;

