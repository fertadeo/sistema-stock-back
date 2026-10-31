import { Router } from 'express';
import { RepartidorRutaController } from '../controllers/repartidorRutaController';
import { requireRole } from '../middlewares/auth';
import { USER_ROLES } from '../constants/roles';

const router = Router();
const controller = new RepartidorRutaController();

router.get('/paradas', controller.listarParadas);
router.post('/paradas', controller.crearParada);
router.patch('/paradas/:id', controller.actualizarParada);
router.delete('/paradas/:id', controller.eliminarParada);
router.post('/paradas/:id/alerta-enviada', controller.marcarAlertaEnviada);

router.post(
  '/delegar',
  requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN),
  controller.delegarRuta
);

router.get('/push/vapid-public-key', controller.obtenerVapidPublicKey);
router.post('/push/subscribe', controller.suscribirPush);
router.post('/push/unsubscribe', controller.desuscribirPush);
router.get('/push/estado', controller.obtenerEstadoPush);
router.post('/push/test', controller.enviarPushPrueba);

export default router;
