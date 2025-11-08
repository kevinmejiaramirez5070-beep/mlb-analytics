// Vercel serverless function para el servidor Express
// Cargar variables de entorno explícitamente
require('dotenv').config();

// Debug: Verificar variables de entorno (solo en desarrollo)
if (process.env.NODE_ENV !== 'production') {
  console.log('DB_HOST:', process.env.DB_HOST);
  console.log('DB_TYPE:', process.env.DB_TYPE);
}

const app = require('../server/index.js');

// Exportar handler para Vercel
module.exports = (req, res) => {
  return app(req, res);
};
