import { Router } from 'express';
import { 
  getClientes, 
  getClienteById,
  createCliente, 
  deleteCliente, 
  updateCliente, 
  getClientesPorMes, 
  getNextClienteId,
  prestarEnvases,
  getEnvasesPrestadosPorCliente,
  toggleEstadoCliente
} from '../controllers/clienteController';

const router = Router();

// Rutas principales de clientes
router.get('/', getClientes);
router.get('/clientes-por-mes', getClientesPorMes);
router.get('/getNextClienteId', getNextClienteId);

// Ruta para obtener un cliente por ID (debe ir antes de /:id/envases)
router.get('/:id', getClienteById);
router.post('/', createCliente);
router.put('/:id', updateCliente);
router.delete('/:id', deleteCliente);

// Ruta para activar/desactivar cliente
router.patch('/:id/estado', toggleEstadoCliente);

// Rutas de envases prestados
router.post('/envases/prestar', prestarEnvases);
router.get('/:id/envases', getEnvasesPrestadosPorCliente);

export default router;
 