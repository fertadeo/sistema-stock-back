import { Router } from 'express';
import {
  listarAvisos,
  marcarAvisoLeido,
  marcarTodosAvisosLeidos,
} from '../controllers/avisoRepartidorController';

const router = Router();

router.get('/', listarAvisos);
router.post('/leer-todos', marcarTodosAvisosLeidos);
router.patch('/:id/leido', marcarAvisoLeido);

export default router;
