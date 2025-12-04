import { loadEnv, defineConfig, ContainerRegistrationKeys } from '@medusajs/framework/utils'
import * as fs from 'fs'
import * as path from 'path'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Solo deshabilitar si la variable de entorno está explícitamente definida
// NO deshabilitar automáticamente durante el build (para permitir construcción)
const explicitDisable = process.env.DISABLE_MEDUSA_ADMIN === "true"

// En runtime, verificar si el build existe para mostrar warning
// Pero NO deshabilitar automáticamente - dejar que Medusa lo maneje
let shouldDisableAdmin = explicitDisable

// Solo verificar build en runtime (cuando se inicia el servidor)
if (!explicitDisable && process.env.NODE_ENV !== 'development') {
  const adminIndexPath = path.join(process.cwd(), '.medusa', 'admin', 'index.html')
  const adminBuildExists = fs.existsSync(adminIndexPath)
  
  if (!adminBuildExists) {
    console.warn('⚠️  Admin build not found at .medusa/admin/index.html.')
    console.warn('   Server will start but admin panel may not be accessible.')
    console.warn('   To build admin, run: npm run build')
    // NO deshabilitamos automáticamente - dejamos que Medusa lo maneje
  }
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL, // Dejalo así, en Railway funcionará
    workerMode: "shared",
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  // @ts-ignore
  admin: {
    disable: shouldDisableAdmin,
  },
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/services/mercadopago-provider.ts",
            id: "mercadopago",
            options: {
               access_token: process.env.MERCADOPAGO_ACCESS_TOKEN,
               public_key: process.env.MERCADOPAGO_PUBLIC_KEY,
            },
            dependencies: [
              ContainerRegistrationKeys.LOGGER
            ]
          }
        ]
      }
    }
  ]
})