import { Router } from 'express';
import {  obtenerTodosLosProveedores } from '../controllers/proveedoresController';

const router = Router();

// Ruta para obtener todos los proveedores
router.get('/', obtenerTodosLosProveedores);

export default router;
