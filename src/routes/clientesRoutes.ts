import { Router } from 'express';
import { 
  getClientes, 
  createCliente, 
  deleteCliente, 
  updateCliente, 
  getClientesPorMes, 
  getNextClienteId,
  prestarEnvases,
  getEnvasesPrestadosPorCliente
} from '../controllers/clienteController';

const router = Router();

// Rutas principales de clientes
router.get('/', getClientes);
router.get('/clientes-por-mes', getClientesPorMes);
router.post('/', createCliente);
router.put('/:id', updateCliente);
router.delete('/:id', deleteCliente);
router.get('/getNextClienteId', getNextClienteId);

// Rutas de envases prestados
router.post('/envases/prestar', prestarEnvases);
router.get('/:id/envases', getEnvasesPrestadosPorCliente);

export default router;
 