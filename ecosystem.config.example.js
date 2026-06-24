/**
 * Copiar a ecosystem.config.js y completar credenciales.
 *
 * IMPORTANTE — PM2 y env_production:
 * Las variables en "env_production" SOLO se cargan si arrancás con:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 restart ecosystem.config.js --env production --update-env
 *
 * Si el VPS solo corre en producción, es más simple poner todo en "env"
 * (ver bloque comentado abajo) y evitar depender de --env production.
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
        // Push al celular del repartidor (PWA Android). NO envía correos.
        // Generar claves: npx web-push generate-vapid-keys
        VAPID_PUBLIC_KEY: 'TU_VAPID_PUBLIC_KEY',
        VAPID_PRIVATE_KEY: 'TU_VAPID_PRIVATE_KEY',
        VAPID_SUBJECT: 'https://sistema.soderiadonjavier.com',
      },
    },
  ],
};

// Alternativa recomendada para VPS solo producción — reemplazar el module.exports de arriba:
// module.exports = {
//   apps: [{
//     name: 'sistema-stock-backend',
//     script: './dist/index.js',
//     cwd: __dirname,
//     env: {
//       NODE_ENV: 'production',
//       DB_HOST: 'localhost',
//       // ... todas las variables aquí, incluidas VAPID_*
//     },
//   }],
// };
