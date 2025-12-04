#!/bin/bash
# No usar set -e aquí porque queremos manejar errores del build manualmente

echo "=== Railway Start Script for Medusa v2 ==="
echo "Checking if .medusa/admin exists..."

# Función para deshabilitar admin y continuar
disable_admin_and_continue() {
  echo "⚠️  Admin build failed or not found. Disabling admin panel..."
  export DISABLE_MEDUSA_ADMIN=true
  echo "✅ DISABLE_MEDUSA_ADMIN=true set. Server will start without admin panel."
}

# Si .medusa no existe o no tiene admin, intentar construir
if [ ! -d ".medusa/admin" ]; then
  echo "⚠️  .medusa/admin not found. Attempting to build Medusa..."
  
  # Intentar build - capturar exit code pero no fallar
  set +e  # Deshabilitar exit on error temporalmente
  BUILD_OUTPUT=$(npm run build 2>&1)
  BUILD_EXIT_CODE=$?
  set -e  # Rehabilitar exit on error
  
  if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo "✅ Build command completed successfully"
  else
    echo "⚠️  Build command exited with code $BUILD_EXIT_CODE, but continuing..."
    echo "Build output (last 20 lines):"
    echo "$BUILD_OUTPUT" | tail -20
  fi
  
  # Verificar si el build del admin fue exitoso
  if [ ! -d ".medusa/admin" ]; then
    echo "⚠️  Admin build directory still not found after build attempt"
    echo "Listing .medusa contents:"
    ls -la .medusa/ 2>/dev/null || echo ".medusa directory does not exist"
    disable_admin_and_continue
  elif [ ! -f ".medusa/admin/index.html" ]; then
    echo "⚠️  Admin directory exists but index.html is missing"
    echo "Searching for index.html:"
    find .medusa -name "index.html" -type f 2>/dev/null || echo "No index.html found"
    disable_admin_and_continue
  else
    echo "✅ Admin build successful - index.html found at .medusa/admin/index.html"
  fi
else
  echo "✅ .medusa/admin already exists, checking index.html..."
  
  # Verificar que index.html existe
  if [ ! -f ".medusa/admin/index.html" ]; then
    echo "⚠️  .medusa/admin exists but index.html is missing"
    disable_admin_and_continue
  else
    echo "✅ index.html found at .medusa/admin/index.html"
  fi
fi

echo "=== Starting Medusa server ==="
if [ "$DISABLE_MEDUSA_ADMIN" = "true" ]; then
  echo "ℹ️  Admin panel is DISABLED. Server will run without admin UI."
  echo "ℹ️  You can access the API at /store and /admin endpoints"
fi

# Iniciar servidor - aquí SÍ queremos que falle si hay error
set -e
npm run start

