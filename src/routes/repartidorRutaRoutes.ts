import { Router } from 'express';
import { RepartidorRutaController } from '../controllers/repartidorRutaController';

const router = Router();
const controller = new RepartidorRutaController();

router.get('/paradas', controller.listarParadas);
router.post('/paradas', controller.crearParada);
router.patch('/paradas/:id', controller.actualizarParada);
router.delete('/paradas/:id', controller.eliminarParada);
router.post('/paradas/:id/alerta-enviada', controller.marcarAlertaEnviada);

router.get('/push/vapid-public-key', controller.obtenerVapidPublicKey);
router.post('/push/subscribe', controller.suscribirPush);
router.post('/push/unsubscribe', controller.desuscribirPush);
router.get('/push/estado', controller.obtenerEstadoPush);
router.post('/push/test', controller.enviarPushPrueba);

export default router;
