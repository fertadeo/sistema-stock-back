/**
 * Copiar a ecosystem.config.js y completar credenciales.
 *
 * Arranque en producción (aplica el bloque env_production):
 *   pm2 start ecosystem.config.js --env production
 *
 * Alternativa: poner las variables directamente en "env" si el servidor
 * solo corre en producción (no hace falta --env production).
 */
module.exports = {
  apps: [
    {
      name: 'sistema-stock-backend',
      script: './dist/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
        DB_HOST: 'localhost',
        DB_USER: 'fenecstudio',
        DB_PASSWORD: 'TU_PASSWORD_AQUI',
        DB_NAME: 'soderia',
        DB_POOL_SIZE: '10',
        JWT_SECRET: 'tu_jwt_secret',
        GOOGLE_MAPS_API_KEY: 'tu_api_key',
        FRONTEND_URL: 'https://sistema.soderiadonjavier.com',
        CORS_ORIGINS: 'https://sistema.soderiadonjavier.com',
        // Generar con: npx web-push generate-vapid-keys
        VAPID_PUBLIC_KEY: 'TU_VAPID_PUBLIC_KEY',
        VAPID_PRIVATE_KEY: 'TU_VAPID_PRIVATE_KEY',
        VAPID_SUBJECT: 'mailto:soporte@soderiadonjavier.com',
      },
    },
  ],
};
