import { Router } from "express";
import { VentaController } from "../controllers/ventaController";

const router = Router();
const ventaController = new VentaController();

// Ruta para crear una nueva venta
router.post("/", ventaController.crearVenta);

// Ruta para crear una venta local
router.post("/local", ventaController.crearVentaLocal);

// Ruta para obtener el resumen de ventas
router.get("/resumen", ventaController.obtenerResumenVentas);

// Ruta para datos de ventas y fiados (dashboard/visualización)
router.get("/visualizacion", ventaController.obtenerDatosParaVisualizacion);

// Ruta para eliminar una venta
router.delete("/:ventaId", ventaController.eliminarVenta);

// Ruta para obtener ventas locales
router.get("/local", ventaController.obtenerVentasLocales);

export default router; 