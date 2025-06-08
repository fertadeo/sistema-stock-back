import { Router } from 'express';
import { gastoController } from '../controllers/gastoController';

const router = Router();

// Rutas para gastos
router.post('/', gastoController.registrarGasto);
router.get('/', gastoController.obtenerGastos);
router.get('/:id', gastoController.obtenerGastoPorId);

export default router; 