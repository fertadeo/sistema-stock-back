import 'reflect-metadata';
import express from 'express';
import colors from 'colors';
import { initializeDatabase, AppDataSource } from './config/database';
import { User } from './entities/User';
import clientesRoutes from './routes/clientesRoutes';
import { corsMiddleware } from './middlewares/cors';
import authRoutes from './routes/auth';
import userRoutes from './routes/userRoutes';
import productosRoutes from './routes/productRoutes';
import proveedoresRoutes from './routes/proveedoresRoutes';
import ventaRoutes from "./routes/ventaRoutes";
import repartidorRoutes from "./routes/repartidorRoutes";
import cargaRoutes from './routes/cargaRoutes';
import descargaRoutes from './routes/descargaRoutes';
import ventasCerradasRoutes from './routes/ventasCerradasRoutes';
import revendedorRoutes from './routes/revendedorRoutes';
import geocodeRoutes from './routes/geocode';
import movimientoRoutes from './routes/movimientoRoutes';
import gastoRoutes from './routes/gastoRoutes';
import metricasRoutes from './routes/metricasRoutes';

const app = express();
const port = 8080;

// Middleware
app.use(express.json());
app.use(corsMiddleware);

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/repartidores', repartidorRoutes);
app.use('/api/cargas', cargaRoutes);
app.use('/api/descargas', descargaRoutes);
app.use('/api/ventas-cerradas', ventasCerradasRoutes);
app.use('/api/revendedores', revendedorRoutes);
app.use('/api/geocode', geocodeRoutes);
app.use('/api/movimientos', movimientoRoutes);
app.use('/api/gastos', gastoRoutes);
app.use('/api/metricas', metricasRoutes);

// Rutas adicionales
app.get('/', (req, res) => {
  res.send('¡Hola, mundo!');
});

app.get('/users', async (req, res) => {
  const userRepository = AppDataSource.getRepository(User);
  const users = await userRepository.find();
  res.json(users);
});

app.post('/users', async (req, res) => {
  const userRepository = AppDataSource.getRepository(User);
  const user = userRepository.create(req.body);
  const result = await userRepository.save(user);
  res.send(result);
});

// Inicialización de la base de datos y arranque del servidor
initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(colors.blue(`Servidor escuchando en http://localhost:${port}`));
  });
}).catch(error => console.log(error));
