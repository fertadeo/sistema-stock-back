import { Router } from "express";
import { RepartidorController } from "../controllers/repartidorController";
import {
  getResumenCuentaCorrienteRepartidor,
  createPagoRepartidor,
  getCuentaCorrienteRepartidor,
  getPagosPorRepartidor,
  getRepartidoresDeudores
} from "../controllers/cuentaCorrienteRepartidorController";

const router = Router();
const repartidorController = new RepartidorController();

router.post("/", repartidorController.crear);
router.get("/", repartidorController.obtenerTodos);
router.get("/zona", repartidorController.obtenerPorZona);
router.get("/totales", repartidorController.obtenerTotales);
router.get("/totales/todos", repartidorController.obtenerTodosTotales);
router.get("/deudores", getRepartidoresDeudores);
router.get("/:id", repartidorController.obtenerPorId);
router.get("/:id/cuenta-corriente/resumen", getResumenCuentaCorrienteRepartidor);
router.get("/:id/cuenta-corriente", getCuentaCorrienteRepartidor);
router.get("/:id/pagos", getPagosPorRepartidor);
router.post("/:id/pagos", createPagoRepartidor);
router.put("/:id", repartidorController.actualizar);
router.delete("/:id", repartidorController.eliminar);

export default router; 