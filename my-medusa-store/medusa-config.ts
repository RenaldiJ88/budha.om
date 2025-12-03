import { loadEnv, defineConfig, ContainerRegistrationKeys } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // --- CAMBIOS AGREGADOS AQUÍ ---
    redisUrl: process.env.REDIS_URL,
    workerMode: "shared",
    // -----------------------------
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
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