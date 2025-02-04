import { Router } from "express";
import { CargaController } from "../controllers/cargaController";

const router = Router();
const cargaController = new CargaController();

router.post("/", cargaController.crear);
router.get("/repartidor/:repartidorId", cargaController.obtenerPorRepartidor);
router.patch("/:id/estado", cargaController.actualizarEstado);

export default router; 