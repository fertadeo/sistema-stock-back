import express from 'express';
import { 
  createVentaCerrada, 
  getVentasCerradas, 
  getVentaCerradaById,
  getVentasCerradasByRepartidor,
  actualizarVentaCerrada,
  eliminarVentaCerrada
} from '../controllers/ventaCerradaController';

const router = express.Router();

// Crear una nueva venta cerrada
router.post('/', createVentaCerrada);

// Obtener todas las ventas cerradas
router.get('/', getVentasCerradas);

// Obtener una venta cerrada por ID
router.get('/:id', getVentaCerradaById);

// Obtener ventas cerradas por repartidor
router.get('/repartidor/:repartidorId', getVentasCerradasByRepartidor);

// Actualizar una venta cerrada
router.put('/:id', actualizarVentaCerrada);

router.delete('/:id', eliminarVentaCerrada);

export default router; 