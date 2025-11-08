const axios = require('axios');

// Script simple para probar URLs de fotos de MLB
async function testSimpleUrls() {
  try {
    console.log('🔍 Probando URLs simples de fotos de MLB...');
    
    // IDs de jugadores conocidos
    const playerIds = [545361, 592450, 608369, 663554, 806960];
    
    // URLs conocidas que funcionan
    const workingUrls = [
      // URL principal de MLB (formato actual)
      'https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/{id}',
      
      // URL alternativa (formato más reciente)
      'https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/{id}',
      
      // URL con formato diferente
      'https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1024/mlb/{id}',
      
      // URL sin transformaciones
      'https://img.mlbstatic.com/mlb-images/image/upload/mlb/{id}',
      
      // URL con extensión
      'https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/{id}.jpg',
      
      // URL de la API de MLB (nueva)
      'https://statsapi.mlb.com/api/v1/people/{id}/image',
      
      // URL de fotos de perfil
      'https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/{id}_profile'
    ];
    
    for (const playerId of playerIds) {
      console.log(`\n🎯 Jugador ID: ${playerId}`);
      
      for (const urlTemplate of workingUrls) {
        const url = urlTemplate.replace('{id}', playerId);
        
        try {
          console.log(`   Probando: ${url}`);
          const response = await axios.get(url, {
            timeout: 5000,
            validateStatus: () => true
          });
          
          if (response.status === 200) {
            console.log(`   ✅ FUNCIONA! Status: ${response.status}, Content-Type: ${response.headers['content-type']}`);
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
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSimpleUrls();
