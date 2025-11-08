// Vercel serverless function para el servidor Express
// Cargar variables de entorno explícitamente
require('dotenv').config();

// Debug: Verificar variables de entorno (siempre en Vercel para debug)
console.log('🔍 Verificando variables de entorno:');
console.log('DB_TYPE:', process.env.DB_TYPE);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_SSL:', process.env.DB_SSL);
console.log('NODE_ENV:', process.env.NODE_ENV);

const app = require('../server/index.js');

// Exportar handler para Vercel
module.exports = (req, res) => {
  return app(req, res);
};
