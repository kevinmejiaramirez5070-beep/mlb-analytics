# 🚀 Guía de Despliegue en Vercel

Esta guía te ayudará a desplegar tu aplicación MLB Analytics en Vercel.

## 📋 Prerrequisitos

1. **Cuenta en Vercel**: Crea una cuenta en [https://vercel.com](https://vercel.com)
2. **GitHub/GitLab/Bitbucket**: Tu código debe estar en un repositorio Git
3. **Variables de entorno**: Necesitarás las credenciales de Supabase

## 🔧 Pasos para Desplegar

### 1. Preparar el Repositorio

Asegúrate de que tu código esté en un repositorio Git:

```bash
cd mlb
git init
git add .
git commit -m "Preparar para despliegue en Vercel"
git remote add origin <tu-repositorio-url>
git push -u origin main
```

### 2. Crear Proyecto en Vercel

1. Ve a [https://vercel.com](https://vercel.com)
2. Haz clic en **"Add New Project"**
3. Conecta tu repositorio Git
4. Selecciona el repositorio de tu proyecto

### 3. Configurar el Proyecto en Vercel

**Configuración del Proyecto:**
- **Framework Preset**: Otro (o deja en blanco)
- **Root Directory**: `mlb` (si tu proyecto está en una subcarpeta)
- **Build Command**: `cd client && npm install && npm run build`
- **Output Directory**: `client/build`
- **Install Command**: `npm install`

### 4. Configurar Variables de Entorno

En la configuración del proyecto en Vercel, ve a **Settings → Environment Variables** y agrega:

```env
DB_TYPE=postgres
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_password_de_supabase
DB_NAME=postgres
DB_SSL=true
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://tu-proyecto.vercel.app
```

**⚠️ IMPORTANTE**: Reemplaza los valores con tus credenciales reales de Supabase.

### 5. Desplegar

1. Haz clic en **"Deploy"**
2. Espera a que termine el build
3. ¡Listo! Tu aplicación estará disponible en `https://tu-proyecto.vercel.app`

## 🔍 Verificar el Despliegue

### Verificar Frontend
- Visita `https://tu-proyecto.vercel.app`
- Deberías ver tu aplicación React funcionando

### Verificar Backend API
- Visita `https://tu-proyecto.vercel.app/api/health`
- Deberías ver una respuesta JSON con el estado del servidor

## 🐛 Solución de Problemas

### Error: "Module not found"
- Verifica que todas las dependencias estén en `package.json`
- Asegúrate de que `npm install` se ejecute correctamente

### Error: "Database connection failed"
- Verifica que las variables de entorno estén configuradas correctamente
- Asegúrate de que Supabase permita conexiones desde Vercel (verifica la configuración de red)

### Error: "Build failed"
- Revisa los logs de build en Vercel
- Verifica que el comando de build sea correcto
- Asegúrate de que todas las dependencias estén instaladas

### API no funciona
- Verifica que las rutas `/api/*` estén configuradas correctamente en `vercel.json`
- Revisa los logs de las funciones serverless en Vercel

## 📝 Notas Importantes

1. **Variables de Entorno**: Nunca subas tu archivo `.env` a Git. Usa las variables de entorno de Vercel.

2. **Base de Datos**: Asegúrate de que Supabase permita conexiones desde las IPs de Vercel.

3. **CORS**: El código ya está configurado para permitir CORS desde cualquier origen en producción.

4. **Build**: El build del cliente se ejecuta automáticamente durante el despliegue.

5. **Serverless Functions**: El backend se ejecuta como funciones serverless en Vercel.

## 🔄 Actualizaciones Futuras

Cada vez que hagas `git push` a tu repositorio, Vercel desplegará automáticamente una nueva versión.

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Vercel Dashboard
2. Verifica las variables de entorno
3. Revisa la documentación de Vercel: [https://vercel.com/docs](https://vercel.com/docs)

---

¡Listo! Tu aplicación debería estar funcionando en Vercel. 🎉

