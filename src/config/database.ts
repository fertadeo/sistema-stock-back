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
export const AppDataSource = new DataSource({
  type: 'mysql',
  host: isProduction ? process.env.DB_HOST_PROD : process.env.DB_HOST_DEV,
  port:  3306, 
  username: isProduction ? process.env.DB_USER_PROD : process.env.DB_USER_DEV,
  password: isProduction ? process.env.DB_PASSWORD_PROD : process.env.DB_PASSWORD_DEV,
  database: isProduction ? process.env.DB_NAME_PROD : process.env.DB_NAME_DEV,
  synchronize: false,
  logging: false,
  entities: [User, Clientes, Productos, Venta, Repartidor, Carga, Descarga, CargaItem, DescargaEnvases, EnvasesPrestados, Zona],
});



console.log({
  DB_HOST: isProduction ? process.env.DB_HOST_PROD : process.env.DB_HOST_DEV,
  DB_USER: isProduction ? process.env.DB_USER_PROD : process.env.DB_USER_DEV,
  DB_PASSWORD: isProduction ? process.env.DB_PASSWORD_PROD : process.env.DB_PASSWORD_DEV,
  DB_NAME: isProduction ? process.env.DB_NAME_PROD : process.env.DB_NAME_DEV,
});

export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log('Conexión a la base de datos establecida');
  } catch (error) {
    console.error('Error al conectar con la base de datos', error);
    process.exit(1); 
  }
};
