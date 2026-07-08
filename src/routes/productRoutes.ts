import { Router } from 'express';
import {
  actualizarProducto,
  crearProducto,
  importarProductos,
  obtenerProductoPorId,
  obtenerTodosLosProductos,
  obtenerUltimoIdProducto,
} from '../controllers/productController';

const router = Router();

router.post('/importar-productos', importarProductos);
router.post('/crear-producto', crearProducto);
router.get('/last-id/obtener', obtenerUltimoIdProducto);
router.get('/', obtenerTodosLosProductos);
router.get('/:id', obtenerProductoPorId);
router.put('/:id', actualizarProducto);

export default router;
