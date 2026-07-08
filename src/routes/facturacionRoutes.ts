import { Router } from 'express';
import facturacionController from '../controllers/facturacionController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
// router.use(authenticateToken);

// Rutas principales de facturación
router.post('/factura', facturacionController.crearFactura);
router.get('/ultimo-comprobante/:tipoComprobante', facturacionController.obtenerUltimoComprobante);
router.get('/contribuyente/:cuit', facturacionController.consultarContribuyente);
router.get('/contribuyente-real/:cuit', facturacionController.consultarContribuyenteReal);
router.get('/contribuyente-fallback/:cuit', facturacionController.consultarContribuyenteFallback);
router.get('/validar-cuit/:cuit', facturacionController.validarCuit);
router.get('/verificar-comprobante/:tipoComprobante/:puntoVenta/:numeroComprobante/:cuit', facturacionController.verificarComprobante);

// Rutas de catálogos y referencias
router.get('/tipos-comprobante', facturacionController.obtenerTiposComprobante);
router.get('/tipos-documento', facturacionController.obtenerTiposDocumento);
router.get('/alicuotas-iva', facturacionController.obtenerAlicuotasIva);

// Rutas de diagnóstico
router.get('/test-afip', facturacionController.testAfip);
router.get('/test-contribuyente/:cuit', facturacionController.testContribuyente);
router.get('/test-cuit-oficial', facturacionController.testCuitOficial);
router.get('/test-otros-metodos', facturacionController.testOtrosMetodos);
router.get('/verificar-metodos-afip', facturacionController.verificarMetodosAfip);
router.get('/diagnostico-completo', facturacionController.diagnosticoCompleto);

// Rutas de certificados
router.post('/crear-certificado-desarrollo', facturacionController.crearCertificadoDesarrollo);
router.post('/crear-certificado-desarrollo-http', facturacionController.crearCertificadoDesarrolloHttp);
router.post('/crear-certificado-produccion', facturacionController.crearCertificadoProduccion);
router.get('/certificados', facturacionController.listarCertificados);

// Integración con ventas existentes
router.post('/factura-desde-venta/:ventaId', facturacionController.crearFacturaDesdeVenta);

export default router;
