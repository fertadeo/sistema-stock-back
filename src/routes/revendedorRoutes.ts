import { Router } from 'express';
import { getRevendedores, createRevendedor } from '../controllers/revendedorController';

const router = Router();

// Obtener todos los revendedores
router.get('/', getRevendedores);

// Crear un nuevo revendedor
router.post('/', createRevendedor);

export default router; 