import { Router } from 'express';
import { actualizarPreciosPorProveedor, actualizarProducto, crearProducto, importarProductos, obtenerProductoPorId, obtenerProductosPorProveedor ,obtenerTodosLosProductos, obtenerUltimoIdProducto } from '../controllers/productController'; // Asegúrate de que el controlador esté bien importado

const router = Router();

// Ruta para importar productos desde un archivo CSV o JSON
router.post('/importar-productos', importarProductos);
router.get('/:id', obtenerProductoPorId);
router.get('/', obtenerTodosLosProductos);
router.get('/last-id/obtener', obtenerUltimoIdProducto)
router.get('/', obtenerProductoPorId)
router.put('/:id', actualizarProducto); // Nueva ruta para actualizar productos
router.put('/actualizar-precios/:id', actualizarPreciosPorProveedor);
router.get('/proveedor/:proveedor_id', obtenerProductosPorProveedor);

router.post('/crear-producto', crearProducto)
export default router; 