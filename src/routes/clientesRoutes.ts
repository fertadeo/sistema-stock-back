import { Router } from 'express';
import { 
  getClientes, 
  getClienteById,
  createCliente, 
  deleteCliente, 
  updateCliente, 
  getClientesPorMes, 
  getNextClienteId,
  getZonas,
  geocodificarPendientes,
  prestarEnvases,
  getEnvasesPrestadosPorCliente,
  toggleEstadoCliente,
  vincularCliente,
  desvincularCliente,
  getResumenDomicilio
} from '../controllers/clienteController';
import {
  createCobroPorCliente,
  getClientesDeudores,
  getCobrosPorCliente,
  getCuentaCorriente,
  getCuentaCorrienteResumen
} from '../controllers/cuentaCorrienteController';
import {
  createMovimientoEnvasesPorCliente,
  getEnvasesResumenPorCliente,
  getMovimientosEnvasesPorCliente
} from '../controllers/envasesClienteController';

const router = Router();

// Rutas principales de clientes
router.get('/', getClientes);
router.get('/deudores', getClientesDeudores);
router.get('/clientes-por-mes', getClientesPorMes);
router.get('/getNextClienteId', getNextClienteId);
router.get('/zonas', getZonas);
router.post('/geocodificar-pendientes', geocodificarPendientes);
router.get('/:id/domicilio/resumen', getResumenDomicilio);
router.get('/:id/cuenta-corriente/resumen', getCuentaCorrienteResumen);
router.get('/:id/cuenta-corriente', getCuentaCorriente);
router.get('/:id/cobros', getCobrosPorCliente);
router.post('/:id/cobros', createCobroPorCliente);
router.get('/:id/envases/resumen', getEnvasesResumenPorCliente);
router.get('/:id/envases/movimientos', getMovimientosEnvasesPorCliente);
router.post('/:id/envases/movimientos', createMovimientoEnvasesPorCliente);

// Ruta para obtener un cliente por ID (debe ir antes de /:id/envases)
router.get('/:id', getClienteById);
router.post('/', createCliente);
router.put('/:id', updateCliente);
router.delete('/:id', deleteCliente);

// Ruta para activar/desactivar cliente
router.patch('/:id/estado', toggleEstadoCliente);

// Vinculación de clientes del mismo domicilio
router.post('/:id/vincular', vincularCliente);
router.delete('/:id/vincular', desvincularCliente);

// Rutas de envases prestados
router.post('/envases/prestar', prestarEnvases);
router.get('/:id/envases', getEnvasesPrestadosPorCliente);

export default router;
 