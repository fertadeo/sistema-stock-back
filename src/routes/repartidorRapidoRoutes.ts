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

// Ruta para obtener resumen de envases de un cliente
router.get('/envases/:cliente_id', repartidorRapidoController.obtenerResumenEnvases);

export default router;
