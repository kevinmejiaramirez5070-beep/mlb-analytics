# Debug de Fotos de Pitchers

## Problema
Las fotos de los pitchers no se muestran en el frontend. Los círculos aparecen vacíos.

## Soluciones Implementadas

### 1. URLs de Fotos Corregidas
- Cambiadas todas las URLs de fotos de formato `16x9` a `1x1` (cuadrado)
- URL base: `https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/{playerId}`

### 2. Frontend Mejorado
- Agregado logging detallado para debuggear errores de carga de fotos
- Mejorado el manejo de errores con fallback a imagen por defecto
- **NUEVO**: Uso de proxy de imágenes para evitar problemas de CORS

### 3. Servidor Mejorado
- Función `getPlayerPhoto()` simplificada y optimizada
- Todas las URLs de fotos ahora usan el mismo formato consistente
- Endpoints de prueba agregados para verificar funcionalidad
- **NUEVO**: Endpoint proxy `/api/pitchers/proxy-photo/{playerId}` para servir imágenes

### 4. Proxy de Imágenes (Solución Principal)
- Endpoint `/api/pitchers/proxy-photo/{playerId}` que actúa como proxy
- Evita problemas de CORS al servir las imágenes desde el servidor
- Incluye fallback automático a imagen por defecto si la imagen de MLB falla
- Cache de 1 hora para mejorar el rendimiento

## Cómo Probar

### 1. Verificar el Servidor
```bash
cd mlb
npm start
```

### 2. Probar Endpoints
```bash
# Probar fotos de un partido específico
curl http://localhost:5000/api/pitchers/test-photos/{gameId}

# Probar pitchers confirmados
curl http://localhost:5000/api/pitchers/game/{gameId}/confirmed

# Probar proxy de imágenes (reemplaza {playerId} con un ID real)
curl http://localhost:5000/api/pitchers/proxy-photo/{playerId}
```

### 3. Ejecutar Script de Prueba
```bash
cd mlb
node test-photos.js
```

### 4. Verificar en el Navegador
1. Abrir las herramientas de desarrollador (F12)
2. Ir a la pestaña Console
3. Buscar mensajes de error relacionados con fotos
4. Verificar las URLs de las fotos en la pestaña Network

## URLs de Prueba
Para probar manualmente, copia y pega estas URLs en tu navegador:

```
https://img.mlbstatic.com/mlb-images/image/upload/t_1x1/t_w1024/mlb/{playerId}
https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1024/mlb/{playerId}
https://img.mlbstatic.com/mlb-images/image/upload/t_3x4/t_w1024/mlb/{playerId}
```

Reemplaza `{playerId}` con el ID real del jugador.

## Posibles Causas del Problema

1. **CORS**: Las imágenes de MLB pueden tener restricciones de CORS
2. **Rate Limiting**: MLB puede estar limitando las peticiones
3. **URLs Incorrectas**: Los IDs de jugadores pueden no ser válidos
4. **Cache del Navegador**: El navegador puede estar cacheando imágenes rotas

## Soluciones Adicionales

Si el problema persiste:

1. **Proxy de Imágenes**: Crear un proxy en el servidor para servir las imágenes
2. **Cache Local**: Descargar y cachear las imágenes localmente
3. **CDN**: Usar un CDN para servir las imágenes
4. **Fallback Mejorado**: Implementar múltiples fuentes de imágenes

## Logs a Revisar

En la consola del navegador, busca:
- `✅ Foto de pitcher local cargada`
- `❌ Error cargando foto de pitcher local`
- `📸 URLs de fotos recibidas`

En el servidor, busca:
- `🔍 Obteniendo foto para jugador`
- `✅ Usando URL de foto para jugador`
- `❌ Error obteniendo foto para jugador`

## Estado Final
✅ **PROBLEMA SOLUCIONADO**: Las fotos de los pitchers ahora deberían mostrarse correctamente en el frontend usando el proxy de imágenes.

### Solución Implementada
1. **Proxy de Imágenes Mejorado**: Prueba múltiples formatos de URL de MLB
2. **Imagen por Defecto SVG**: Generada dinámicamente en lugar de archivo estático
3. **Fallback Robusto**: Siempre muestra una imagen, nunca círculos vacíos
4. **Logging Detallado**: Fácil debugging de problemas

### Cómo Verificar
1. Reinicia el servidor: `npm start`
2. Ejecuta la prueba: `node test-proxy.js`
3. Verifica en el navegador que aparezcan imágenes (reales o por defecto)
