import { Router } from 'express';
import { getClientes, createCliente, deleteCliente, updateCliente, getClientesPorMes, getNextClienteId} from '../controllers/clienteController';

const router = Router();

router.get('/', getClientes);
router.get('/clientes-por-mes', getClientesPorMes);
router.post('/', createCliente);
router.put('/:id', updateCliente);
router.delete('/:id', deleteCliente);
router.get('/getNextClienteId', getNextClienteId)
export default router;
 