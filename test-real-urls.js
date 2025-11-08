const axios = require('axios');

// Script para probar URLs reales de fotos de MLB
async function testRealUrls() {
  try {
    console.log('🔍 Probando URLs reales de fotos de MLB...');
    
    // IDs de jugadores famosos que definitivamente tienen fotos
    const playerIds = [545361, 592450, 608369]; // Mike Trout, Aaron Judge, Shohei Ohtani
    
    // URLs que sé que funcionan actualmente
    const realUrls = [
      // URLs principales de MLB
      'https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/{id}',
      'https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/{id}',
      'https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1024/mlb/{id}',
      
      // URLs con extensiones
      'https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/{id}.jpg',
      'https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/{id}.jpg',
      'https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1024/mlb/{id}.jpg',
      
      // URLs sin transformaciones
      'https://img.mlbstatic.com/mlb-images/image/upload/mlb/{id}',
      'https://img.mlbstatic.com/mlb-images/image/upload/mlb/{id}.jpg',
      
      // URLs de la API de MLB
      'https://statsapi.mlb.com/api/v1/people/{id}/image',
      
      // URLs con diferentes tamaños
      'https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w512/mlb/{id}',
      'https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w512/mlb/{id}',
      'https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w256/mlb/{id}',
      'https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w256/mlb/{id}'
    ];
    
    for (const playerId of playerIds) {
      console.log(`\n🎯 Jugador ID: ${playerId}`);
      
      for (const urlTemplate of realUrls) {
        const url = urlTemplate.replace('{id}', playerId);
        
        try {
          console.log(`   Probando: ${url}`);
          const response = await axios.get(url, {
            timeout: 5000,
            validateStatus: () => true
          });
          
          if (response.status === 200) {
            console.log(`   ✅ FUNCIONA! Status: ${response.status}, Content-Type: ${response.headers['content-type']}`);
            console.log(`   🎉 URL que funciona: ${url}`);
            return url; // Retornar la primera URL que funciona
          } else {
            console.log(`   ❌ Falló con status: ${response.status}`);
          }
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
        }
        
        // Pausa pequeña
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log('\n❌ No se encontraron URLs que funcionen');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testRealUrls();
