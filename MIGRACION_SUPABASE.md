# 🚀 Guía de Migración: MySQL a Supabase (PostgreSQL)

Esta guía te ayudará a migrar tu base de datos de MySQL a Supabase (PostgreSQL).

## 📋 Pasos para Migrar a Supabase

### 1. Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Haz clic en "New Project"
4. Completa la información:
   - **Name**: mlb-analytics (o el nombre que prefieras)
   - **Database Password**: Crea una contraseña segura (¡guárdala!)
   - **Region**: Elige la región más cercana
5. Espera a que se cree el proyecto (2-3 minutos)

### 2. Obtener Credenciales de Conexión

1. En tu proyecto de Supabase, ve a **Settings** → **Database**
2. Busca la sección **Connection string** → **URI**
3. Copia la cadena de conexión. Se verá así:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
4. También necesitarás:
   - **Host**: `db.xxxxx.supabase.co`
   - **Port**: `5432`
   - **Database**: `postgres`
   - **User**: `postgres`
   - **Password**: La que creaste al crear el proyecto

### 3. Crear las Tablas en Supabase

1. En Supabase, ve a **SQL Editor** (en el menú lateral)
2. Haz clic en **New Query**
3. Abre el archivo `setup_supabase_database.sql` de este proyecto
4. Copia y pega todo el contenido en el editor SQL
5. Haz clic en **Run** (o presiona `Ctrl+Enter`)
6. Verifica que todas las tablas se crearon correctamente

### 4. Migrar los Datos (Opcional)

Si ya tienes datos en MySQL y quieres migrarlos:

#### Opción A: Exportar desde MySQL e Importar a Supabase

1. **Exportar desde MySQL:**
   ```bash
   mysqldump -u root -p mlbb > backup_mysql.sql
   ```

2. **Convertir el SQL** (necesitarás ajustar manualmente):
   - Cambiar `AUTO_INCREMENT` por `SERIAL`
   - Cambiar `ENUM` por `VARCHAR` con `CHECK`
   - Cambiar `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` por `TIMESTAMP DEFAULT NOW()`
   - Cambiar `ON DUPLICATE KEY UPDATE` por `ON CONFLICT ... DO UPDATE`

3. **Importar a Supabase:**
   - Ve al SQL Editor de Supabase
   - Pega el SQL convertido
   - Ejecuta el script

#### Opción B: Script de Migración Automática

Puedes crear un script Node.js para migrar los datos automáticamente (ver sección más abajo).

### 5. Configurar el Proyecto para Usar Supabase

1. **Instalar dependencias:**
   ```bash
   cd mlb
   npm install
   ```

2. **Crear archivo `.env`:**
   ```bash
   cp env.example .env
   ```

3. **Editar `.env`** con tus credenciales de Supabase:
   ```env
   DB_TYPE=postgres
   DB_HOST=db.xxxxx.supabase.co
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=tu_password_aqui
   DB_NAME=postgres
   DB_SSL=true
   ```

4. **Actualizar `database.js`** para usar PostgreSQL:
   
   Cambia en `server/config/database.js`:
   ```javascript
   // Cambiar de:
   const mysql = require('mysql2/promise');
   // A:
   const { Pool } = require('pg');
   
   // Y usar database-postgres.js en lugar de database.js
   ```
   
   O simplemente renombra los archivos:
   ```bash
   # Respaldar el original
   mv server/config/database.js server/config/database-mysql.js
   
   # Usar el de PostgreSQL
   mv server/config/database-postgres.js server/config/database.js
   ```

### 6. Probar la Conexión

1. **Iniciar el servidor:**
   ```bash
   npm start
   ```

2. **Verificar en los logs** que dice:
   ```
   ✅ Base de datos inicializada correctamente
   ```

3. **Probar en Supabase:**
   - Ve a **Table Editor** en Supabase
   - Deberías ver las tablas: `teams`, `games`, `analysis`, `weight_configs`, `backups`

## 🔄 Script de Migración de Datos (Opcional)

Si quieres migrar datos existentes de MySQL a Supabase, aquí tienes un script:

```javascript
// migrate-data.js
const mysql = require('mysql2/promise');
const { Pool } = require('pg');
require('dotenv').config();

async function migrate() {
  // Conexión MySQL
  const mysqlPool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB
  });

  // Conexión PostgreSQL (Supabase)
  const pgPool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Migrar teams
    const [teams] = await mysqlPool.execute('SELECT * FROM teams');
    for (const team of teams) {
      await pgPool.query(
        'INSERT INTO teams (mlb_id, name, abbreviation) VALUES ($1, $2, $3) ON CONFLICT (mlb_id) DO NOTHING',
        [team.mlb_id, team.name, team.abbreviation]
      );
    }
    console.log(`✅ Migrados ${teams.length} equipos`);

    // Migrar games
    const [games] = await mysqlPool.execute('SELECT * FROM games');
    for (const game of games) {
      await pgPool.query(
        'INSERT INTO games (mlb_id, home_team_id, away_team_id, game_date, game_time, status, home_score, away_score) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (mlb_id) DO NOTHING',
        [game.mlb_id, game.home_team_id, game.away_team_id, game.game_date, game.game_time, game.status, game.home_score, game.away_score]
      );
    }
    console.log(`✅ Migrados ${games.length} partidos`);

    // Migrar analysis
    const [analysis] = await mysqlPool.execute('SELECT * FROM analysis');
    for (const a of analysis) {
      await pgPool.query(
        'INSERT INTO analysis (game_id, home_probability, away_probability, home_american_odds, away_american_odds, level, model_version, weights_version) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING',
        [a.game_id, a.home_probability, a.away_probability, a.home_american_odds, a.away_american_odds, a.level, a.model_version, a.weights_version]
      );
    }
    console.log(`✅ Migrados ${analysis.length} análisis`);

    // Migrar weight_configs
    const [configs] = await mysqlPool.execute('SELECT * FROM weight_configs');
    for (const config of configs) {
      await pgPool.query(
        'INSERT INTO weight_configs (version, pitcher_weight, batting_weight, bullpen_weight, defense_weight, context_weight, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (version) DO UPDATE SET pitcher_weight = EXCLUDED.pitcher_weight, batting_weight = EXCLUDED.batting_weight, bullpen_weight = EXCLUDED.bullpen_weight, defense_weight = EXCLUDED.defense_weight, context_weight = EXCLUDED.context_weight, is_active = EXCLUDED.is_active',
        [config.version, config.pitcher_weight, config.batting_weight, config.bullpen_weight, config.defense_weight, config.context_weight, config.is_active]
      );
    }
    console.log(`✅ Migrados ${configs.length} configuraciones`);

    console.log('✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error en la migración:', error);
  } finally {
    await mysqlPool.end();
    await pgPool.end();
  }
}

migrate();
```

## ⚠️ Diferencias Importantes: MySQL vs PostgreSQL

### 1. Tipos de Datos
- `AUTO_INCREMENT` → `SERIAL` o `GENERATED ALWAYS AS IDENTITY`
- `ENUM` → `VARCHAR` con `CHECK` constraint
- `DECIMAL` → `NUMERIC` (aunque `DECIMAL` también funciona)
- `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` → `TIMESTAMP DEFAULT NOW()`

### 2. Sintaxis SQL
- `ON DUPLICATE KEY UPDATE` → `ON CONFLICT ... DO UPDATE`
- `LIMIT` funciona igual
- `OFFSET` funciona igual
- Parámetros: `?` (MySQL) → `$1, $2, $3...` (PostgreSQL)

### 3. Funciones
- `NOW()` en lugar de `CURRENT_TIMESTAMP` (aunque ambos funcionan)
- `COALESCE()` funciona igual
- `GREATEST()` funciona igual

## 🔍 Verificar la Migración

1. **En Supabase Table Editor:**
   - Verifica que todas las tablas existen
   - Revisa que los datos se migraron correctamente

2. **En tu aplicación:**
   - Inicia el servidor
   - Prueba los endpoints de la API
   - Verifica que los datos se leen correctamente

## 📝 Notas Finales

- **Seguridad**: Nunca subas tu archivo `.env` a Git
- **Backup**: Siempre haz backup antes de migrar
- **Pruebas**: Prueba en un entorno de desarrollo primero
- **SSL**: Supabase requiere SSL, asegúrate de configurar `DB_SSL=true`

## 🆘 Solución de Problemas

### Error: "SSL connection required"
- Asegúrate de tener `DB_SSL=true` en tu `.env`

### Error: "password authentication failed"
- Verifica que la contraseña en `.env` sea correcta
- Puedes resetear la contraseña en Supabase Settings → Database

### Error: "relation does not exist"
- Ejecuta el script `setup_supabase_database.sql` en el SQL Editor de Supabase

### Error: "syntax error at or near"
- Verifica que estés usando la sintaxis correcta de PostgreSQL
- Revisa el archivo `database-postgres.js` para ver ejemplos

---

¡Listo! Tu aplicación ahora debería estar funcionando con Supabase. 🎉

