import { Router } from 'express';
import { metricasController } from '../controllers/metricasController';

const router = Router();

router.get('/', metricasController.obtenerMetricas);

export default router; 