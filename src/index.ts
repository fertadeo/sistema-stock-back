import 'reflect-metadata';
import express from 'express';
import colors from 'colors';
import { initializeDatabase } from './config/database';
import clientesRoutes from './routes/clientesRoutes';
import { corsMiddleware } from './middlewares/cors';
import { authenticateToken } from './middlewares/auth';
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
import rutasRoutes from './routes/rutasRoutes';
import movimientoRoutes from './routes/movimientoRoutes';
import gastoRoutes from './routes/gastoRoutes';
import metricasRoutes from './routes/metricasRoutes';
import reportesRoutes from './routes/reportesRoutes';
import repartidorRapidoRoutes from './routes/repartidorRapidoRoutes';
import sincronizacionRoutes from './routes/sincronizacionRoutes';
import repartidorRutaRoutes from './routes/repartidorRutaRoutes';
import { repartidorRutaService } from './services/repartidorRutaService';

const app = express();
const port = 8080;

// Middleware
app.use(express.json());
app.use(corsMiddleware);

app.use((req, res, next) => {
  const path = req.originalUrl.split('?')[0];
  if (path === '/api/auth/login') {
    return next();
  }
  if (path.startsWith('/api/')) {
    return authenticateToken(req, res, next);
  }
  return next();
});

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
app.use('/api/rutas', rutasRoutes);
app.use('/api/movimientos', movimientoRoutes);
app.use('/api/gastos', gastoRoutes);
app.use('/api/metricas', metricasRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/repartidor-rapido', repartidorRapidoRoutes);
app.use('/api/sincronizacion', sincronizacionRoutes);
app.use('/api/repartidor-ruta', repartidorRutaRoutes);

app.get('/', (req, res) => {
  res.send('¡Hola, mundo!');
});

// Inicialización de la base de datos y arranque del servidor
initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(colors.blue(`Servidor escuchando en http://localhost:${port}`));
  });

  setInterval(() => {
    void repartidorRutaService.procesarAlertasPendientes().catch((error) => {
      console.error('[ruta-alertas] Error procesando alertas:', error);
    });
  }, 60_000);
}).catch(error => console.log(error));
