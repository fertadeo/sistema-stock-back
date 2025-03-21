import { Router } from 'express';
import { descargaController } from '../controllers/descargaController';

const router = Router();

// Crear una nueva descarga
router.post('/', descargaController.crear);

// Obtener todas las descargas
router.get('/', descargaController.obtenerTodas);

// Obtener descargas por repartidor
router.get('/repartidor/:repartidor_id', descargaController.obtenerPorRepartidor);

// Obtener resumen de una descarga
router.get('/resumen/:descarga_id', descargaController.obtenerResumen);

// Obtener resumen de ventas por producto y período
router.get('/ventas-resumen', descargaController.obtenerResumenVentas);

// Obtener detalle de envases por descarga
router.get('/envases/:descarga_id', descargaController.obtenerDetalleEnvases);

// Cerrar cuenta de una descarga
router.post('/cerrar-cuenta/:descarga_id', descargaController.cerrarCuenta);

// Obtener estado de cuenta de una descarga
router.get('/estado-cuenta/:descarga_id', descargaController.obtenerEstadoCuenta);

export default router; 