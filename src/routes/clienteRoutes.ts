import { Router } from 'express';
import { prestarEnvases, getEnvasesPrestadosPorCliente } from '../controllers/clienteController';

const router = Router();

// Ruta para prestar envases
router.post('/clientes/envases/prestar', prestarEnvases);

// Ruta para obtener los envases prestados de un cliente específico
router.get('/clientes/:id/envases', getEnvasesPrestadosPorCliente);

export default router; 