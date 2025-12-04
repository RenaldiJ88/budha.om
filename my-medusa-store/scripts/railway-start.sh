#!/bin/bash
set -e

echo "=== Railway Start Script for Medusa v2 ==="
echo "Checking if .medusa/admin exists..."

# Si .medusa no existe o no tiene admin, construir
if [ ! -d ".medusa/admin" ]; then
  echo "⚠️  .medusa/admin not found. Building Medusa..."
  npm run build
  
  # Verificar que el build fue exitoso
  if [ ! -d ".medusa/admin" ]; then
    echo "❌ ERROR: Build completed but .medusa/admin still not found"
    echo "Listing .medusa contents:"
    ls -la .medusa/ || echo ".medusa directory does not exist"
    exit 1
  fi
else
  echo "✅ .medusa/admin already exists, skipping build"
fi

# Verificar que index.html existe
if [ ! -f ".medusa/admin/index.html" ]; then
  echo "❌ ERROR: index.html not found in .medusa/admin/"
  echo "Searching for index.html:"
  find .medusa -name "index.html" -type f || echo "No index.html found anywhere"
  exit 1
fi

echo "✅ index.html found at .medusa/admin/index.html"
echo "=== Starting Medusa server ==="

# Iniciar servidor
npm run start

