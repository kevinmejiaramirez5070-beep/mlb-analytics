const axios = require('axios');

// Script para probar diferentes formatos de URLs de fotos de MLB
async function testMLBUrls() {
  try {
    console.log('🔍 Probando diferentes formatos de URLs de fotos de MLB...');
    
    // IDs de jugadores conocidos (jugadores famosos que deberían tener fotos)
    const testPlayerIds = [
      545361, // Mike Trout
      592450, // Aaron Judge
      608369, // Shohei Ohtani
      663554, // Casey Mize (del partido actual)
      806960  // Luis Morales (del partido actual)
    ];
    
    // Diferentes formatos de URLs a probar
    const urlFormats = [
      // Formato original
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/{id}`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1024/mlb/{id}`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/{id}`,
      
      // Formatos alternativos
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/{id}.jpg`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1024/mlb/{id}.jpg`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/{id}.jpg`,
      
      // Formatos con diferentes tamaños
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w512/mlb/{id}`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w256/mlb/{id}`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w128/mlb/{id}`,
      
      // Formatos sin transformaciones
      `https://img.mlbstatic.com/mlb-images/image/upload/mlb/{id}`,
      `https://img.mlbstatic.com/mlb-images/image/upload/mlb/{id}.jpg`,
      
      // Formatos con diferentes transformaciones
      `https://img.mlbstatic.com/mlb-images/image/upload/t_8x8/t_w1024/mlb/{id}`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_2x2/t_w1024/mlb/{id}`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_4x3/t_w1024/mlb/{id}`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_5x7/t_w1024/mlb/{id}`,
      
      // URLs alternativas de MLB
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/{id}.png`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/{id}.jpeg`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/{id}.webp`,
      
      // URLs con diferentes dominios
      `https://mlb-cuts-diamond.mlb.com/FORGE/2024/2024-03/14/2024-03-14/2024-03-14/mlb/{id}.jpg`,
      `https://mlb-cuts-diamond.mlb.com/FORGE/2024/2024-03/14/2024-03-14/2024-03-14/mlb/{id}.png`,
      
      // URLs de la API de MLB
      `https://statsapi.mlb.com/api/v1/people/{id}/image`,
      `https://statsapi.mlb.com/api/v1/people/{id}/photo`,
      
      // URLs de imágenes de perfil
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/{id}_profile`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/{id}_headshot`,
      `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/{id}_portrait`
    ];
    
    const results = [];
    
    for (const playerId of testPlayerIds) {
      console.log(`\n🎯 Probando jugador ID: ${playerId}`);
      const playerResults = [];
      
      for (const urlFormat of urlFormats) {
        const url = urlFormat.replace('{id}', playerId);
        
        try {
          const response = await axios.get(url, {
            method: 'HEAD',
            timeout: 5000,
            validateStatus: () => true // No lanzar error para códigos de estado no exitosos
          });
          
          if (response.status === 200) {
            console.log(`✅ URL funciona: ${url}`);
            playerResults.push({
              url: url,
              status: response.status,
              contentType: response.headers['content-type'],
              working: true
            });
          } else {
            console.log(`❌ URL falla (${response.status}): ${url}`);
            playerResults.push({
              url: url,
              status: response.status,
              working: false
            });
          }
        } catch (error) {
          console.log(`❌ Error con URL: ${url} - ${error.message}`);
          playerResults.push({
            url: url,
            error: error.message,
            working: false
          });
        }
        
        // Pequeña pausa para no sobrecargar el servidor
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      results.push({
        playerId: playerId,
        results: playerResults,
        workingUrls: playerResults.filter(r => r.working)
      });
    }
    
    // Resumen de resultados
    console.log('\n📊 RESUMEN DE RESULTADOS:');
    console.log('========================');
    
    for (const result of results) {
      console.log(`\nJugador ID ${result.playerId}:`);
      if (result.workingUrls.length > 0) {
        console.log(`✅ ${result.workingUrls.length} URLs funcionan:`);
        result.workingUrls.forEach(url => {
          console.log(`   - ${url.url} (${url.status})`);
        });
      } else {
        console.log(`❌ No se encontraron URLs que funcionen`);
      }
    }
    
    // Encontrar patrones de URLs que funcionan
    const allWorkingUrls = results.flatMap(r => r.workingUrls);
    if (allWorkingUrls.length > 0) {
      console.log('\n🎯 PATRONES DE URLs QUE FUNCIONAN:');
      console.log('==================================');
      
      const patterns = {};
      allWorkingUrls.forEach(url => {
        const pattern = url.url.replace(/\d+/g, '{id}');
        if (!patterns[pattern]) {
          patterns[pattern] = 0;
        }
        patterns[pattern]++;
      });
      
      Object.entries(patterns)
        .sort(([,a], [,b]) => b - a)
        .forEach(([pattern, count]) => {
          console.log(`${pattern} (${count} veces)`);
        });
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
  }
}

// Ejecutar la prueba
testMLBUrls();
