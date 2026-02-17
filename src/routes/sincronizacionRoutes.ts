import { Router } from 'express';
import { SincronizacionController } from '../controllers/sincronizacionController';

const router = Router();
const sincronizacionController = new SincronizacionController();

// Ruta para verificar conectividad
router.get('/ping', sincronizacionController.ping);

// Ruta para sincronizar operaciones pendientes
router.post('/operaciones', sincronizacionController.sincronizarOperaciones);

// Ruta para obtener estado de sincronización
router.get('/estado', sincronizacionController.obtenerEstadoSincronizacion);

// Ruta para reintentar operaciones con error
router.post('/reintentar', sincronizacionController.reintentarOperacionesConError);

export default router;
