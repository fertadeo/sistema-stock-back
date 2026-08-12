import { Router } from 'express';
import { ZonaRadioController } from '../controllers/zonaRadioController';

const router = Router();
const controller = new ZonaRadioController();

router.get('/', controller.listar);
router.get('/:id', controller.obtenerPorId);
router.post('/', controller.crear);
router.put('/:id', controller.actualizar);
router.delete('/:id', controller.eliminar);

export default router;
