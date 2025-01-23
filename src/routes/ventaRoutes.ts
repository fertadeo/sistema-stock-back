import { Router } from "express";
import { VentaController } from "../controllers/ventaController";

const router = Router();
const ventaController = new VentaController();

// Ruta para crear una nueva venta
router.post("/", ventaController.crearVenta);

// Ruta para obtener el resumen de ventas
router.get("/resumen", ventaController.obtenerResumenVentas);

export default router; 