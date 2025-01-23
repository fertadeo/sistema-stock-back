import { Router } from "express";
import { RepartidorController } from "../controllers/repartidorController";

const router = Router();
const repartidorController = new RepartidorController();

router.post("/", repartidorController.crear);
router.get("/", repartidorController.obtenerTodos);
router.get("/zona", repartidorController.obtenerPorZona);
router.get("/:id", repartidorController.obtenerPorId);
router.put("/:id", repartidorController.actualizar);
router.delete("/:id", repartidorController.eliminar);

export default router; 