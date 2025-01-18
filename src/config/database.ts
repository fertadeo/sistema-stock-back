import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { Clientes } from '../entities/Clientes';
import { Pedido } from '../entities/Pedido';
import { Producto } from '../entities/Producto';
import { Proveedores } from '../entities/Proveedores';
import dotenv from 'dotenv';


// Determinar si estamos en modo producción o desarrollo
const isProduction = process.env.NODE_ENV === 'production';

dotenv.config({
  path: isProduction ? '.env.production' : '.env'
});



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
  entities: [User, Clientes, Pedido, Producto, Proveedores],
});


console.log({
  DB_HOST: process.env.DB_HOST_DEV,
  DB_USER: process.env.DB_USER_DEV,
  DB_PASSWORD: process.env.DB_PASSWORD_DEV,
  DB_NAME: process.env.DB_NAME_DEV,
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
