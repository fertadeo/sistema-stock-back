import { Request, Response } from "express";
import { VentaService } from "../services/ventaService";
import { AppDataSource } from '../config/database';
import { Venta } from '../entities/Venta';
import { MovimientoService } from '../services/movimientoService';
import { Productos } from '../entities/Productos';

const ventaRepository = AppDataSource.getRepository(Venta);
const movimientoService = new MovimientoService();

export class VentaController {
    private ventaService = new VentaService();

    private esErrorDeValidacionVenta(error: unknown): error is Error {
        if (!(error instanceof Error)) {
            return false;
        }

        return [
            'Los productos son requeridos y deben ser un array',
            'El monto total debe ser un número mayor a 0',
            'Medio de pago inválido',
            'Forma de pago inválida',
            'El monto del saldo es requerido para pagos parciales',
            'El monto del saldo debe ser un número mayor a 0',
            'El monto del saldo no puede ser mayor al monto total'
        ].includes(error.message);
    }

    crearVenta = async (req: Request, res: Response) => {
        try {
            const ventaData = req.body;
            const nuevaVenta = await this.ventaService.crearVenta(ventaData);
            res.status(201).json(nuevaVenta);
        } catch (error) {
            const status = this.esErrorDeValidacionVenta(error) ? 400 : 500;

            res.status(status).json({ 
                message: "Error al crear la venta",
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

    obtenerResumenVentas = async (req: Request, res: Response) => {
        try {
            const { fechaInicio, fechaFin } = req.query;
            
            const fechaInicioDate = fechaInicio ? new Date(fechaInicio as string) : undefined;
            const fechaFinDate = fechaFin ? new Date(fechaFin as string) : undefined;

            const resumen = await this.ventaService.obtenerResumenVentas(
                fechaInicioDate,
                fechaFinDate
            );

            res.json(resumen);
        } catch (error) {
            res.status(500).json({ 
                message: "Error al obtener el resumen de ventas",
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

    obtenerDatosParaVisualizacion = async (req: Request, res: Response) => {
        try {
            const { fechaInicio, fechaFin } = req.query;
            const fechaInicioDate = fechaInicio ? new Date(fechaInicio as string) : undefined;
            const fechaFinDate = fechaFin ? new Date(fechaFin as string) : undefined;

            const datos = await this.ventaService.obtenerDatosParaVisualizacion(
                fechaInicioDate,
                fechaFinDate
            );

            res.json(datos);
        } catch (error) {
            res.status(500).json({
                message: 'Error al obtener datos para visualización',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

    eliminarVenta = async (req: Request, res: Response) => {
        try {
            const { ventaId } = req.params;
            
            if (!ventaId) {
                return res.status(400).json({
                    success: false,
                    message: "El ID de la venta es requerido"
                });
            }

            await this.ventaService.eliminarVenta(ventaId);

            res.json({
                success: true,
                message: "Venta eliminada correctamente"
            });
        } catch (error) {
            res.status(500).json({ 
                success: false,
                message: "Error al eliminar la venta",
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

    crearVentaLocal = async (req: Request, res: Response) => {
        try {
            const { 
                productos,
                monto_total,
                cliente_id,
                nombre_cliente,
                telefono_cliente,
                forma_pago = 'total',
                saldo_monto,
                observaciones
            } = req.body;
            const medio_pago = req.body.medio_pago ?? req.body.metodo_pago;
            
            // Validar datos requeridos
            if (!productos || !Array.isArray(productos) || productos.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe proporcionar al menos un producto'
                });
            }

            if (!monto_total || monto_total <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El monto total debe ser mayor a 0'
                });
            }

            if (!medio_pago) {
                return res.status(400).json({
                    success: false,
                    message: 'El medio_pago es obligatorio'
                });
            }

            // Crear la venta con los datos mejorados
            const venta = await this.ventaService.crearVenta({
                tipo: 'LOCAL',
                monto_total,
                cliente_id,
                nombre_cliente,
                telefono_cliente,
                medio_pago,
                forma_pago,
                saldo_monto,
                observaciones,
                productos: productos.map(p => ({
                    producto_id: p.producto_id,
                    cantidad: p.cantidad,
                    precio_unitario: p.precio_unitario,
                    subtotal: (p.cantidad * p.precio_unitario).toString()
                }))
            });

            // Registrar el movimiento
            await movimientoService.registrarVentaLocal(
                monto_total,
                productos.map((p: any) => p.nombre),
                {
                    venta_id: venta.venta_id,
                    productos_detalle: productos,
                    cliente_id,
                    nombre_cliente,
                    telefono_cliente,
                    medio_pago,
                    saldo_monto
                }
            );

            res.status(201).json({
                success: true,
                message: 'Venta registrada exitosamente',
                venta
            });
        } catch (error) {
            console.error('Error al crear venta:', error);
            const status = this.esErrorDeValidacionVenta(error) ? 400 : 500;

            res.status(status).json({
                success: false,
                message: 'Error al registrar la venta',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

    obtenerVentasLocales = async (req: Request, res: Response) => {
        try {
            const ventas = await ventaRepository.find({
                where: {
                    tipo: 'LOCAL'
                },
                order: {
                    fecha_venta: 'DESC'
                }
            });

            // Obtener todos los productos para mapear nombres
            const productosRepository = AppDataSource.getRepository(Productos);
            const productos = await productosRepository.find();
            const productosMap = new Map(productos.map(p => [p.id.toString(), p.nombreProducto]));

            // Enriquecer las ventas con los nombres de los productos
            const ventasEnriquecidas = ventas.map(venta => ({
                ...venta,
                productos: venta.productos.map(producto => ({
                    ...producto,
                    nombre: productosMap.get(producto.producto_id) || 'Producto no encontrado'
                }))
            }));

            res.json({
                success: true,
                ventas: ventasEnriquecidas
            });
        } catch (error) {
            console.error('Error al obtener ventas locales:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener las ventas locales',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }
} 