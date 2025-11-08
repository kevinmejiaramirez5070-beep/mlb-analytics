// Vercel serverless function para el servidor Express
const app = require('../server/index.js');

// Inicializar base de datos antes de exportar
const { initializeDatabase } = require('../server/config/database');

// Inicializar base de datos cuando se carga la función
let dbInitialized = false;
const initDB = async () => {
  if (!dbInitialized) {
    try {
      await initializeDatabase();
      dbInitialized = true;
      console.log('✅ Base de datos inicializada en Vercel');
    } catch (error) {
      console.error('❌ Error inicializando base de datos:', error);
    }
  }
};

// Inicializar en el primer request
initDB();

module.exports = app;
