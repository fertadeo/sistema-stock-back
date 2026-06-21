import { Router } from 'express';
import { RepartidorRapidoController } from '../controllers/repartidorRapidoController';

const router = Router();
const repartidorRapidoController = new RepartidorRapidoController();

// Ruta para registrar una venta rápida
router.post('/venta', repartidorRapidoController.registrarVentaRapida);

// Ruta para registrar un cobro rápido
router.post('/cobro', repartidorRapidoController.registrarCobroRapido);

// Ruta para registrar un fiado rápido
router.post('/fiado', repartidorRapidoController.registrarFiadoRapido);

// Rutas para visitas donde no se encontró al cliente
router.get('/no-encontrado', repartidorRapidoController.obtenerVisitasNoEncontradas);
router.post('/no-encontrado', repartidorRapidoController.registrarNoEncontrado);

router.get('/clientes-atendidos-hoy', repartidorRapidoController.obtenerClientesAtendidosHoy);

router.post('/ubicacion', repartidorRapidoController.registrarUbicacion);
router.get('/ubicacion', repartidorRapidoController.obtenerUbicacion);

// Ruta para obtener resumen de envases de un cliente
router.get('/envases/:cliente_id', repartidorRapidoController.obtenerResumenEnvases);

export default router;
