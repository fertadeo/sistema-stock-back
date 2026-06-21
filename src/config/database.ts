import 'reflect-metadata';
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

// Determinar si estamos en modo producción o desarrollo
const isProduction = process.env.NODE_ENV === 'production';

dotenv.config({
  path: isProduction ? '.env.production' : '.env.development'
});
// Cargar el archivo .env correcto
const envFile = isProduction ? '.env.production' : '.env.development';
dotenv.config({ path: envFile });

console.log(`🟢 Cargando configuración desde: ${envFile}`);
console.log(`🔹 DATABASE_URL: ${process.env.DATABASE_URL}`);


// Configurar las variables de conexión dependiendo del entorno
const dbPoolSize = Number(process.env.DB_POOL_SIZE ?? (isProduction ? 10 : 5));

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: isProduction ? process.env.DB_HOST_PROD : process.env.DB_HOST_DEV,
  port: 3306,
  username: isProduction ? process.env.DB_USER_PROD : process.env.DB_USER_DEV,
  password: isProduction ? process.env.DB_PASSWORD_PROD : process.env.DB_PASSWORD_DEV,
  database: isProduction ? process.env.DB_NAME_PROD : process.env.DB_NAME_DEV,
  synchronize: false,
  logging: false,
  entities: [User, Clientes, Productos, Venta, Repartidor, Carga, Descarga, CargaItem, DescargaEnvases, EnvasesPrestados, Zona, VentaCerrada, Revendedor, Movimiento, Cobro, MovimientoEnvase, OperacionPendiente, VisitaNoEncontrado],
  extra: {
    connectionLimit: Number.isFinite(dbPoolSize) && dbPoolSize > 0 ? dbPoolSize : 5,
    waitForConnections: true,
    queueLimit: 20,
  },
  poolSize: Number.isFinite(dbPoolSize) && dbPoolSize > 0 ? dbPoolSize : 5,
});



console.log({
  DB_HOST: isProduction ? process.env.DB_HOST_PROD : process.env.DB_HOST_DEV,
  DB_USER: isProduction ? process.env.DB_USER_PROD : process.env.DB_USER_DEV,
  DB_PASSWORD: isProduction ? process.env.DB_PASSWORD_PROD : process.env.DB_PASSWORD_DEV,
  DB_NAME: isProduction ? process.env.DB_NAME_PROD : process.env.DB_NAME_DEV,
});

import { runPendingMigrations } from './runMigrations';

export const initializeDatabase = async () => {
  try {
    if (AppDataSource.isInitialized) {
      return;
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
