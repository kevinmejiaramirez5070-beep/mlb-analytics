#!/bin/bash

echo "🚀 Instalando MLB Analytics..."

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instala Node.js v16 o superior."
    exit 1
fi

# Verificar si MySQL está instalado
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL no está instalado. Por favor instala MySQL v8.0 o superior."
    exit 1
fi

echo "✅ Node.js y MySQL detectados"

# Instalar dependencias del backend
echo "📦 Instalando dependencias del backend..."
npm install

# Instalar dependencias del frontend
echo "📦 Instalando dependencias del frontend..."
cd client
npm install
cd ..

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    echo "📝 Creando archivo .env..."
    cp env.example .env
    echo "⚠️  Por favor edita el archivo .env con tus credenciales de MySQL"
fi

echo ""
echo "🎉 Instalación completada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Configura tu base de datos MySQL"
echo "2. Edita el archivo .env con tus credenciales"
echo "3. Ejecuta: npm run dev (para desarrollo)"
echo "4. En otra terminal: cd client && npm start"
echo ""
echo "📖 Consulta el README.md para más información"


