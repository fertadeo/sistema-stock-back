/**
 * Copiar a ecosystem.config.js y completar credenciales.
 *
 * Usar bloque "env" (no solo env_production) para que PM2 cargue las variables
 * con: pm2 start ecosystem.config.js
 *
 * En VPS con max_connections bajo y varias apps MySQL, mantener DB_POOL_SIZE en 1
 * y una sola instancia PM2 (fork). Matá procesos viejos: pm2 delete all && pm2 start ...
 */
module.exports = {
  apps: [
    {
      name: 'sistema-stock-backend',
      script: './dist/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      exp_backoff_restart_delay: 2000,
      max_memory_restart: '500M',
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        DB_HOST: 'localhost',
        DB_USER: 'fenecstudio',
        DB_PASSWORD: 'TU_PASSWORD_AQUI',
        DB_NAME: 'soderia',
        DB_POOL_SIZE: '1',
        JWT_SECRET: 'tu_jwt_secret',
        GOOGLE_MAPS_API_KEY: 'tu_api_key',
        FRONTEND_URL: 'https://sistema.soderiadonjavier.com',
        CORS_ORIGINS: 'https://sistema.soderiadonjavier.com',
        // Push al celular del repartidor (PWA Android). NO envía correos.
        // Generar claves: npx web-push generate-vapid-keys
        VAPID_PUBLIC_KEY: 'TU_VAPID_PUBLIC_KEY',
        VAPID_PRIVATE_KEY: 'TU_VAPID_PRIVATE_KEY',
        VAPID_SUBJECT: 'https://sistema.soderiadonjavier.com',
      },
    },
  ],
};
