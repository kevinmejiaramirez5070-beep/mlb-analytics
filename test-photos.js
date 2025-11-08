const axios = require('axios');

// Script de prueba para verificar fotos de pitchers
async function testPitcherPhotos() {
  try {
    console.log('🔍 Iniciando prueba de fotos de pitchers...');
    
    // URL del servidor
    const baseURL = 'http://localhost:5000';
    
    // 1. Probar endpoint de prueba de fotos
    console.log('\n📸 Probando endpoint de fotos...');
    const testResponse = await axios.get(`${baseURL}/api/pitchers/test-photos/123456`);
    console.log('✅ Respuesta del endpoint de prueba:', testResponse.data);
    
    // 2. Probar endpoint de pitchers confirmados
    console.log('\n🎯 Probando endpoint de pitchers confirmados...');
    const confirmedResponse = await axios.get(`${baseURL}/api/pitchers/game/123456/confirmed`);
    console.log('✅ Respuesta de pitchers confirmados:', confirmedResponse.data);
    
    // 3. Probar URLs de fotos directamente
    if (confirmedResponse.data.success && confirmedResponse.data.data) {
      const { home, away } = confirmedResponse.data.data;
      
      if (home && home.photo_url) {
        console.log('\n🏠 Probando foto del pitcher local...');
        console.log('URL:', home.photo_url);
        try {
          const photoResponse = await axios.get(home.photo_url, { responseType: 'arraybuffer' });
          console.log('✅ Foto del pitcher local cargada correctamente');
          console.log('Tamaño:', photoResponse.data.length, 'bytes');
          console.log('Content-Type:', photoResponse.headers['content-type']);
        } catch (photoError) {
          console.log('❌ Error cargando foto del pitcher local:', photoError.message);
        }
      }
      
      if (away && away.photo_url) {
        console.log('\n✈️ Probando foto del pitcher visitante...');
        console.log('URL:', away.photo_url);
        try {
          const photoResponse = await axios.get(away.photo_url, { responseType: 'arraybuffer' });
          console.log('✅ Foto del pitcher visitante cargada correctamente');
          console.log('Tamaño:', photoResponse.data.length, 'bytes');
          console.log('Content-Type:', photoResponse.headers['content-type']);
        } catch (photoError) {
          console.log('❌ Error cargando foto del pitcher visitante:', photoError.message);
        }
      }
    }
    
    console.log('\n✅ Prueba completada');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    if (error.response) {
      console.error('Respuesta del servidor:', error.response.data);
    }
  }
}

// Ejecutar la prueba
testPitcherPhotos();
