import { loadEnv, defineConfig, ContainerRegistrationKeys } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL!, // Agregado !
    redisUrl: process.env.REDIS_URL!,       // Agregado !
    workerMode: "shared",
    http: {
      storeCors: process.env.STORE_CORS!,   // Agregado ! (Error 1 solucionado)
      adminCors: process.env.ADMIN_CORS!,   // Agregado ! (Error 2 solucionado)
      authCors: process.env.AUTH_CORS!,     // Agregado ! (Error 3 solucionado)
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  admin: {
    // Deshabilita el admin solo si la variable es explícitamente "true"
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
    // Define la URL del backend explícitamente para evitar problemas de CORS en admin
    backendUrl: process.env.MEDUSA_BACKEND_URL || "https://budhaom-production.up.railway.app",
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
               // Usamos || "" para que si falta no rompa el tipado, aunque fallará el pago si está vacío
               access_token: process.env.MERCADOPAGO_ACCESS_TOKEN || "", 
               public_key: process.env.MERCADOPAGO_PUBLIC_KEY || "",
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