import express from 'express';
import { 
  createVentaCerrada, 
  getVentasCerradas, 
  getVentaCerradaById,
  getVentasCerradasByRepartidor,
  actualizarVentaCerrada,
  desagruparVentasCerradas,
  eliminarVentaCerrada
} from '../controllers/ventaCerradaController';

const router = express.Router();

router.post('/', createVentaCerrada);
router.get('/', getVentasCerradas);
router.get('/repartidor/:repartidorId', getVentasCerradasByRepartidor);
router.put('/finalizar', actualizarVentaCerrada);
router.put('/desagrupar', desagruparVentasCerradas);
router.get('/:id', getVentaCerradaById);
router.delete('/:id', eliminarVentaCerrada);

export default router;
