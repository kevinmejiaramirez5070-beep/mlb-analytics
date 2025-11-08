const axios = require('axios');

// Script de prueba para verificar el proxy de imágenes
async function testProxyImages() {
  try {
    console.log('🔍 Iniciando prueba del proxy de imágenes...');
    
    // URL del servidor
    const baseURL = 'http://localhost:5000';
    
    // IDs de jugadores reales del partido actual
    const playerIds = [806960, 663554]; // Luis Morales y Casey Mize
    
    for (const playerId of playerIds) {
      console.log(`\n🎯 Probando proxy para jugador ${playerId}...`);
      
      try {
        const response = await axios.get(`${baseURL}/api/pitchers/proxy-photo/${playerId}`, {
          responseType: 'arraybuffer',
          timeout: 10000
        });
        
        console.log(`✅ Proxy funcionó para jugador ${playerId}`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Content-Type: ${response.headers['content-type']}`);
        console.log(`   Tamaño: ${response.data.length} bytes`);
        
        // Verificar si es SVG (imagen por defecto) o imagen real
        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes('svg')) {
          console.log(`   📝 Es imagen por defecto (SVG)`);
        } else {
          console.log(`   🖼️ Es imagen real de MLB`);
        }
        
      } catch (error) {
        console.log(`❌ Error con proxy para jugador ${playerId}:`, error.message);
        if (error.response) {
          console.log(`   Status: ${error.response.status}`);
          console.log(`   Data: ${error.response.data}`);
        }
      }
    }
    
    // Probar imagen por defecto
    console.log(`\n🖼️ Probando imagen por defecto...`);
    try {
      const defaultResponse = await axios.get(`${baseURL}/api/pitchers/photo/default`, {
        responseType: 'arraybuffer',
        timeout: 10000
      });
      
      console.log(`✅ Imagen por defecto funcionó`);
      console.log(`   Status: ${defaultResponse.status}`);
      console.log(`   Content-Type: ${defaultResponse.headers['content-type']}`);
      console.log(`   Tamaño: ${defaultResponse.data.length} bytes`);
      
    } catch (error) {
      console.log(`❌ Error con imagen por defecto:`, error.message);
    }
    
    console.log('\n✅ Prueba del proxy completada');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
  }
}

// Ejecutar la prueba
testProxyImages();
