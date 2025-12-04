import { loadEnv, defineConfig, ContainerRegistrationKeys } from '@medusajs/framework/utils'
import * as fs from 'fs'
import * as path from 'path'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Verificar si el build del admin existe
const adminIndexPath = path.join(process.cwd(), '.medusa', 'admin', 'index.html')
const adminBuildExists = fs.existsSync(adminIndexPath)

// Deshabilitar admin si: variable está en true O si el build no existe
const shouldDisableAdmin = 
  process.env.DISABLE_MEDUSA_ADMIN === "true" || 
  !adminBuildExists

if (!adminBuildExists && !process.env.DISABLE_MEDUSA_ADMIN) {
  console.warn('⚠️  Admin build not found at .medusa/admin/index.html. Admin panel will be disabled.')
  console.warn('   To enable admin, run: npm run build')
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