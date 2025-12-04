import { loadEnv, defineConfig, ContainerRegistrationKeys } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL!, // El ! fuerza a que sea string (requerido)
    redisUrl: process.env.REDIS_URL!,
    workerMode: "shared",
    http: {
      // Usamos el operador ! porque sabemos que en Railway SI existen.
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  admin: {
    // AQUÍ ESTÁ LA CLAVE: No lo deshabilites dinámicamente.
    // Si la variable no existe, asumimos que queremos el admin (false).
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
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
               // TypeScript fix: Si no hay variable, usa string vacío (fallará el pago, pero no el build)
               access_token: process.env.MERCADOPAGO_ACCESS_TOKEN ?? "", 
               public_key: process.env.MERCADOPAGO_PUBLIC_KEY ?? "",
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