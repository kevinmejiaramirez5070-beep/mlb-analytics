# MLB Analytics - Análisis de Partidos de Béisbol

## 🎯 Descripción

MLB Analytics es una aplicación web que proporciona análisis avanzados de partidos de béisbol de la MLB, incluyendo comparaciones de pitchers abridores confirmados, estadísticas detalladas y predicciones basadas en datos históricos.

## ✨ Características Principales

### 🏟️ Gestión de Partidos
- **Partidos en Tiempo Real**: Visualización de partidos del día con estados actualizados
- **Historial de Partidos**: Acceso a partidos de fechas anteriores
- **Estados de Partidos**: Seguimiento de estados (programado, en vivo, finalizado, etc.)

### ⚾ Pitchers Abridores Confirmados
- **Pitchers Reales**: Obtención de pitchers abridores confirmados por la MLB
- **Fotos Oficiales**: Imágenes reales de los pitchers desde la API de MLB
- **Estadísticas Detalladas**: ERA, WHIP, K/9, FIP, récord W-L, y más
- **Comparación Visual**: Interfaz intuitiva para comparar pitchers
- **Fallback Inteligente**: Si no hay pitchers confirmados, usa el mejor pitcher del roster

### 📊 Análisis Avanzado
- **Predicciones**: Análisis probabilístico de resultados
- **Estadísticas de Equipos**: Bateo, pitcheo, defensa y bullpen
- **Factores Contextuales**: Consideración de múltiples variables
- **Configuración de Pesos**: Personalización de la importancia de cada factor

### 🎨 Interfaz Moderna
- **Diseño Responsivo**: Funciona en dispositivos móviles y desktop
- **UI/UX Intuitiva**: Navegación fácil y visualización clara
- **Indicadores Visuales**: Colores para estadísticas (verde=excelente, naranja=bueno, rojo=pobre)

## 🚀 Instalación

### Prerrequisitos
- Node.js (v14 o superior)
- MySQL (v8.0 o superior)
- npm o yarn

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
   git clone <repository-url>
   cd mlb
   ```

2. **Instalar dependencias**
```bash
npm install
   cd client && npm install
cd ..
```

3. **Configurar base de datos**
   ```bash
   # Crear archivo .env basado en env.example
   cp env.example .env
   
   # Editar .env con tus credenciales de MySQL
   ```

4. **Ejecutar script de instalación**
```bash
   chmod +x install.sh
   ./install.sh
```

5. **Iniciar la aplicación**
```bash
   # Terminal 1 - Servidor
   npm start
   
   # Terminal 2 - Cliente
   cd client && npm start
   ```

## 📡 API Endpoints

### Partidos
- `GET /api/games/today` - Partidos del día
- `GET /api/games/date/:date` - Partidos por fecha
- `GET /api/games/:gameId/detailed` - Información detallada de un partido
- `GET /api/games/live-status/:date` - Estados en tiempo real

### Pitchers
- `GET /api/pitchers/game/:gameId/confirmed` - Pitchers abridores confirmados
- `GET /api/pitchers/team/:teamId` - Pitchers de un equipo
- `GET /api/pitchers/:pitcherId` - Información de un pitcher específico
- `GET /api/pitchers/test-confirmed-pitchers/:gameId` - Prueba de pitchers confirmados

### Análisis
- `POST /api/games/analyze/:gameId` - Analizar un partido
- `GET /api/games/analysis/:gameId` - Obtener análisis de un partido
- `GET /api/games/summary` - Resumen de análisis

## 🔧 Configuración

### Variables de Entorno (.env)
```env
# Base de Datos
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=mlb_analytics

# Servidor
PORT=5000
NODE_ENV=development

# Frontend
FRONTEND_URL=http://localhost:3000
```

### Configuración de Pesos
La aplicación permite configurar la importancia de diferentes factores en el análisis:

- **Pitcher Weight**: Importancia del pitcher abridor (0.0 - 1.0)
- **Batting Weight**: Importancia del bateo del equipo (0.0 - 1.0)
- **Bullpen Weight**: Importancia del bullpen (0.0 - 1.0)
- **Defense Weight**: Importancia de la defensa (0.0 - 1.0)
- **Context Weight**: Importancia de factores contextuales (0.0 - 1.0)

## 🎮 Uso

### 1. Ver Partidos del Día
- Accede a la página principal
- Visualiza todos los partidos programados
- Los estados se actualizan automáticamente

### 2. Seleccionar un Partido
- Haz clic en cualquier partido de la lista
- Se mostrarán los pitchers abridores confirmados
- Si no están confirmados, se mostrará un mensaje informativo

### 3. Comparar Pitchers
- Visualiza estadísticas detalladas de ambos pitchers
- Compara métricas clave (ERA, WHIP, K/9, etc.)
- Las estadísticas se muestran con códigos de color

### 4. Analizar Partido
- Haz clic en "Analizar Partido"
- Obtén predicciones basadas en múltiples factores
- Revisa el análisis detallado y las probabilidades

## 🔍 Funcionalidades de Pitchers

### Obtención de Pitchers Confirmados
La aplicación utiliza múltiples fuentes para obtener los pitchers abridores confirmados:

1. **API de MLB Live Feed**: Obtiene pitchers confirmados en tiempo real
2. **Boxscore**: Busca pitchers en el boxscore del partido
3. **Schedule API**: Verifica pitchers probables del schedule
4. **Fallback**: Si no hay confirmación, usa el mejor pitcher del roster

### Estadísticas Incluidas
- **ERA** (Earned Run Average)
- **WHIP** (Walks + Hits per Innings Pitched)
- **K/9** (Strikeouts per 9 innings)
- **FIP** (Fielding Independent Pitching)
- **Récord W-L** (Victorias-Derrotas)
- **Juegos e Innings Lanzados**

## 🛠️ Desarrollo

### Estructura del Proyecto
```
mlb/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/         # Páginas de la aplicación
│   │   └── App.js         # Componente principal
├── server/                # Backend Node.js
│   ├── routes/           # Rutas de la API
│   ├── services/         # Servicios de negocio
│   └── config/           # Configuración
└── README.md
```

### Comandos de Desarrollo
```bash
# Ejecutar en modo desarrollo
npm run dev

# Ejecutar tests
npm test

# Linting
npm run lint

# Build para producción
npm run build
```

## 🐛 Solución de Problemas

### Pitchers No Aparecen
- Los pitchers abridores se confirman horas antes del partido
- Si no aparecen, es posible que aún no estén confirmados por la MLB
- La aplicación usa un fallback automático con el mejor pitcher del roster

### Errores de Conexión
- Verifica que la API de MLB esté disponible
- Revisa la configuración de red y firewall
- Los errores se manejan graciosamente con mensajes informativos

### Problemas de Base de Datos
- Verifica las credenciales en el archivo .env
- Asegúrate de que MySQL esté ejecutándose
- Ejecuta el script de instalación para crear las tablas

## 📈 Mejoras Futuras

- [ ] Notificaciones en tiempo real
- [ ] Análisis histórico de enfrentamientos
- [ ] Estadísticas avanzadas (WAR, BABIP, etc.)
- [ ] Integración con redes sociales
- [ ] App móvil nativa
- [ ] Análisis de tendencias temporales

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o preguntas:
- Abre un issue en GitHub
- Contacta al equipo de desarrollo
- Revisa la documentación de la API

---

**MLB Analytics** - Análisis inteligente de béisbol ⚾


