import 'reflect-metadata';
import fs from 'fs';
import path from 'path';
import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { Clientes } from '../entities/Clientes';
import { Productos } from '../entities/Productos';
import dotenv from 'dotenv';
import { Venta } from '../entities/Venta';
import { Repartidor } from '../entities/Repartidor';
import { Carga } from '../entities/Carga';
import { Descarga } from '../entities/Descarga';
import { CargaItem } from '../entities/CargaItem';
import { DescargaEnvases } from '../entities/DescargaEnvases';
import { EnvasesPrestados } from '../entities/EnvasesPrestados';
import { Zona } from '../entities/Zona';
import { VentaCerrada } from '../entities/VentaCerrada';
import { Revendedor } from '../entities/Revendedor';
import { Movimiento } from '../entities/Movimiento';
import { Cobro } from '../entities/Cobro';
import { MovimientoEnvase } from '../entities/MovimientoEnvase';
import { OperacionPendiente } from '../entities/OperacionPendiente';
import { VisitaNoEncontrado } from '../entities/VisitaNoEncontrado';
import { RepartidorUbicacion } from '../entities/RepartidorUbicacion';
import { RepartidorRutaParada } from '../entities/RepartidorRutaParada';
import { PushSubscription } from '../entities/PushSubscription';
import { ConfiguracionSistema } from '../entities/ConfiguracionSistema';

const isPm2 = process.env.pm_id !== undefined || Boolean(process.env.PM2_HOME);
let configSource = 'variables de entorno';

if (!isPm2) {
  dotenv.config({ path: '.env' });
  const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
  if (fs.existsSync(path.resolve(envFile))) {
    dotenv.config({ path: envFile, override: true });
    configSource = `.env + ${envFile}`;
  } else {
    configSource = '.env';
  }
} else {
  configSource = 'PM2 (ecosystem.config.js)';
}

const isProduction = process.env.NODE_ENV === 'production';

console.log(
  `Cargando configuración desde: ${configSource} (NODE_ENV=${process.env.NODE_ENV ?? 'no definido'})`
);

if (isPm2 && !isProduction) {
  console.warn(
    '[database] PM2 detectado pero NODE_ENV no es "production". ' +
      'Usa "pm2 start ecosystem.config.js --env production" o mueve las variables al bloque "env".'
  );
}

function resolveDbSetting(
  genericKey: string,
  prodKey: string,
  devKey: string,
  fallback = ''
): string {
  const value =
    process.env[genericKey] ??
    (isProduction ? process.env[prodKey] : process.env[devKey]) ??
    process.env[prodKey] ??
    process.env[devKey];

  return value ?? fallback;
}

const dbHost = resolveDbSetting('DB_HOST', 'DB_HOST_PROD', 'DB_HOST_DEV', 'localhost');
const dbUser = resolveDbSetting('DB_USER', 'DB_USER_PROD', 'DB_USER_DEV', 'root');
const dbPassword = resolveDbSetting('DB_PASSWORD', 'DB_PASSWORD_PROD', 'DB_PASSWORD_DEV');
const dbName = resolveDbSetting('DB_NAME', 'DB_NAME_PROD', 'DB_NAME_DEV', 'soderia');
// En hosting compartido el max_connections de MySQL suele ser bajo; un pool chico evita saturar.
const parsedPoolSize = Number(process.env.DB_POOL_SIZE ?? 2);
const dbPoolSize = Number.isFinite(parsedPoolSize) && parsedPoolSize > 0 ? Math.min(parsedPoolSize, 5) : 2;
const dbConnectRetries = Math.max(1, Number(process.env.DB_CONNECT_RETRIES ?? 8));
const dbConnectRetryMs = Math.max(500, Number(process.env.DB_CONNECT_RETRY_MS ?? 5000));

if (!dbPassword && isProduction) {
  console.error(
    '[database] Falta la contraseña de MySQL. Define DB_PASSWORD en ecosystem.config.js (PM2) o en .env.'
  );
} else if (!dbPassword) {
  console.warn('[database] MySQL sin contraseña (solo desarrollo local).');
}

console.log({
  DB_HOST: dbHost,
  DB_USER: dbUser,
  DB_PASSWORD: dbPassword ? '***' : '(vacía)',
  DB_NAME: dbName,
  DB_POOL_SIZE: dbPoolSize,
});

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: dbHost,
  port: 3306,
  username: dbUser,
  password: dbPassword,
  database: dbName,
  synchronize: false,
  logging: false,
  entities: [User, Clientes, Productos, Venta, Repartidor, Carga, Descarga, CargaItem, DescargaEnvases, EnvasesPrestados, Zona, VentaCerrada, Revendedor, Movimiento, Cobro, MovimientoEnvase, OperacionPendiente, VisitaNoEncontrado, RepartidorUbicacion, RepartidorRutaParada, PushSubscription, ConfiguracionSistema],
  extra: {
    connectionLimit: dbPoolSize,
    waitForConnections: true,
    queueLimit: 50,
    // Liberar conexiones ociosas rápido: otras apps del VPS comparten max_connections.
    idleTimeout: 20_000,
    maxIdle: 1,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
  },
  poolSize: dbPoolSize,
});

import { runPendingMigrations } from './runMigrations';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTooManyConnectionsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: string; errno?: number; message?: string };
  return (
    err.code === 'ER_CON_COUNT_ERROR' ||
    err.errno === 1040 ||
    String(err.message ?? '').toLowerCase().includes('too many connections')
  );
}

export const initializeDatabase = async () => {
  if (AppDataSource.isInitialized) {
    return;
  }
  if (!dbPassword && isProduction) {
    console.error(
      'Contraseña de MySQL no configurada. Revisa ecosystem.config.js (PM2) o el archivo .env.'
    );
    process.exit(1);
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= dbConnectRetries; attempt++) {
    try {
      await AppDataSource.initialize();
      console.log(`Conexión a la base de datos establecida (pool: ${dbPoolSize})`);
      await runPendingMigrations(AppDataSource);
      return;
    } catch (error) {
      lastError = error;
      console.error(
        `Error al conectar con la base de datos (intento ${attempt}/${dbConnectRetries})`,
        error
      );

      if (AppDataSource.isInitialized) {
        try {
          await AppDataSource.destroy();
        } catch {
          // ignore
        }
      }

      if (attempt < dbConnectRetries) {
        const waitMs = isTooManyConnectionsError(error)
          ? dbConnectRetryMs * attempt
          : dbConnectRetryMs;
        console.warn(
          `[database] Reintentando en ${waitMs}ms` +
            (isTooManyConnectionsError(error)
              ? ' (MySQL saturado: bajá DB_POOL_SIZE y cerrá procesos PM2 duplicados)'
              : '')
        );
        await sleep(waitMs);
      }
    }
  }

  console.error('No se pudo conectar a la base de datos tras varios intentos', lastError);
  process.exit(1);
};

export const closeDatabase = async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('Conexión a la base de datos cerrada');
  }
};
