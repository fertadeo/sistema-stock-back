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
const dbPoolSize = Number(process.env.DB_POOL_SIZE ?? (isProduction ? 10 : 5));

if (!dbPassword) {
  console.error(
    '[database] Falta la contraseña de MySQL. Define DB_PASSWORD en ecosystem.config.js (PM2) o en .env.'
  );
}

console.log({
  DB_HOST: dbHost,
  DB_USER: dbUser,
  DB_PASSWORD: dbPassword ? '***' : '(vacía)',
  DB_NAME: dbName,
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
  entities: [User, Clientes, Productos, Venta, Repartidor, Carga, Descarga, CargaItem, DescargaEnvases, EnvasesPrestados, Zona, VentaCerrada, Revendedor, Movimiento, Cobro, MovimientoEnvase, OperacionPendiente, VisitaNoEncontrado, RepartidorUbicacion, RepartidorRutaParada, PushSubscription],
  extra: {
    connectionLimit: Number.isFinite(dbPoolSize) && dbPoolSize > 0 ? dbPoolSize : 5,
    waitForConnections: true,
    queueLimit: 20,
  },
  poolSize: Number.isFinite(dbPoolSize) && dbPoolSize > 0 ? dbPoolSize : 5,
});

import { runPendingMigrations } from './runMigrations';

export const initializeDatabase = async () => {
  try {
    if (AppDataSource.isInitialized) {
      return;
    }
    if (!dbPassword) {
      throw new Error(
        'Contraseña de MySQL no configurada. Revisa ecosystem.config.js (PM2) o el archivo .env.'
      );
    }
    await AppDataSource.initialize();
    console.log(`Conexión a la base de datos establecida (pool: ${dbPoolSize})`);
    await runPendingMigrations(AppDataSource);
  } catch (error) {
    console.error('Error al conectar con la base de datos', error);
    process.exit(1);
  }
};

export const closeDatabase = async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('Conexión a la base de datos cerrada');
  }
};
