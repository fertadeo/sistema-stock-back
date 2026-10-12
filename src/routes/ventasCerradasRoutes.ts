import express from 'express';
import { 
  createVentaCerrada, 
  getVentasCerradas, 
  getVentaCerradaById,
  getVentasCerradasByRepartidor,
  actualizarVentaCerrada,
  corregirVentaCerrada,
  desagruparVentasCerradas,
  eliminarVentaCerrada,
  restaurarVentaCerrada
} from '../controllers/ventaCerradaController';

const router = express.Router();

router.post('/', createVentaCerrada);
router.get('/', getVentasCerradas);
router.get('/repartidor/:repartidorId', getVentasCerradasByRepartidor);
router.put('/finalizar', actualizarVentaCerrada);
router.put('/:id/correccion', corregirVentaCerrada);
router.put('/desagrupar', desagruparVentasCerradas);
router.put('/:id/restaurar', restaurarVentaCerrada);
router.get('/:id', getVentaCerradaById);
router.delete('/:id', eliminarVentaCerrada);

export default router;
