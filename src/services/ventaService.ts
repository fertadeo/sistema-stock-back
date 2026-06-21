import { AppDataSource } from "../config/database";
import { Venta } from "../entities/Venta";
import { Cobro } from "../entities/Cobro";
import { Between } from "typeorm";

const MEDIOS_PAGO_VALIDOS = ['efectivo', 'transferencia', 'debito', 'credito'] as const;
const FORMAS_PAGO_VALIDAS = ['total', 'parcial'] as const;
const MENSAJE_TABLA_COBROS_FALTANTE =
    'La tabla cobros no existe en la base de datos. Ejecuta la migración `migrations/crear_tabla_cobros.sql` o `migrations/crear_tablas_repartidor_rapido.sql`.';
const esErrorTablaFaltante = (error: unknown, tabla: string): boolean => {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const errorBase = error as {
        code?: string;
        sql?: string;
        sqlMessage?: string;
        message?: string;
    };

    if (errorBase.code !== 'ER_NO_SUCH_TABLE') {
        return false;
    }

    const contenido = [errorBase.sql, errorBase.sqlMessage, errorBase.message]
        .filter((valor): valor is string => typeof valor === 'string')
        .join(' ')
        .toLowerCase();

    return contenido.includes(`\`${tabla.toLowerCase()}\``) || contenido.includes(tabla.toLowerCase());
};

export class VentaService {
    private ventaRepository = AppDataSource.getRepository(Venta);
    private cobroRepository = AppDataSource.getRepository(Cobro);

    private async obtenerCobrosRegistrados(): Promise<Cobro[]> {
        try {
            return await this.cobroRepository.find({ order: { fecha_cobro: 'DESC' } });
        } catch (error) {
            if (esErrorTablaFaltante(error, 'cobros')) {
                console.warn(`[VentaService] ${MENSAJE_TABLA_COBROS_FALTANTE}`);
                return [];
            }

            throw error;
        }
    }

    async crearVenta(ventaData: Partial<Venta>): Promise<Venta> {
        // Validar el formato de los datos
        this.validarDatosVenta(ventaData);

        // Si es pago parcial, asegurarse de que el saldo esté configurado correctamente
        if (ventaData.forma_pago === 'parcial') {
            ventaData.saldo = true;
            if (!ventaData.saldo_monto) {
                throw new Error('El monto del saldo es requerido para pagos parciales');
            }
        } else {
            ventaData.saldo = false;
            ventaData.saldo_monto = undefined;
        }

        const venta = this.ventaRepository.create(ventaData);
        return await this.ventaRepository.save(venta);
    }

    async obtenerResumenVentas(fechaInicio?: Date, fechaFin?: Date) {
        const where = fechaInicio && fechaFin 
            ? { fecha_venta: Between(fechaInicio, fechaFin) }
            : {};

        const ventas = await this.ventaRepository.find({
            where,
            order: { fecha_venta: 'DESC' }
        });

        // Calcular estadísticas
        const totalVentas = ventas.length;
        const montoTotal = ventas.reduce((sum, venta) => sum + parseFloat(venta.monto_total), 0);
        const ventasPorDia = this.agruparVentasPorDia(ventas);
        const ventasPorMedioPago = this.agruparVentasPorMedioPago(ventas);
        const ventasConSaldo = ventas.filter(v => v.saldo).length;

        return {
            ventas,
            estadisticas: {
                totalVentas,
                montoTotal: montoTotal.toFixed(2),
                ventasPorDia,
                ventasPorMedioPago,
                ventasConSaldo
            }
        };
    }

    private validarDatosVenta(ventaData: Partial<Venta>) {
        if (!ventaData.productos || !Array.isArray(ventaData.productos)) {
            throw new Error('Los productos son requeridos y deben ser un array');
        }

        const montoTotal = Number(ventaData.monto_total);
        if (!ventaData.monto_total || Number.isNaN(montoTotal) || montoTotal <= 0) {
            throw new Error('El monto total debe ser un número mayor a 0');
        }

        if (!MEDIOS_PAGO_VALIDOS.includes((ventaData.medio_pago ?? '') as typeof MEDIOS_PAGO_VALIDOS[number])) {
            throw new Error('Medio de pago inválido');
        }

        if (!FORMAS_PAGO_VALIDAS.includes((ventaData.forma_pago ?? '') as typeof FORMAS_PAGO_VALIDAS[number])) {
            throw new Error('Forma de pago inválida');
        }

        if (ventaData.forma_pago === 'parcial') {
            const saldoMonto = Number(ventaData.saldo_monto);

            if (!ventaData.saldo_monto || Number.isNaN(saldoMonto) || saldoMonto <= 0) {
                throw new Error('El monto del saldo debe ser un número mayor a 0');
            }

            if (saldoMonto > montoTotal) {
                throw new Error('El monto del saldo no puede ser mayor al monto total');
            }
        }
    }

    private agruparVentasPorDia(ventas: Venta[]) {
        const ventasPorDia = new Map<string, number>();
        
        ventas.forEach(venta => {
            const fecha = venta.fecha_venta.toISOString().split('T')[0];
            const montoActual = ventasPorDia.get(fecha) || 0;
            ventasPorDia.set(fecha, montoActual + parseFloat(venta.monto_total));
        });

        return Object.fromEntries(ventasPorDia);
    }

    private agruparVentasPorMedioPago(ventas: Venta[]) {
        return ventas.reduce((acc, venta) => {
            const medioPago = venta.medio_pago;
            acc[medioPago] = (acc[medioPago] || 0) + 1;
            return acc;
        }, {
            efectivo: 0,
            transferencia: 0,
            debito: 0,
            credito: 0
        } as Record<string, number>);
    }

    /**
     * Obtiene datos de ventas y fiados para visualización/dashboard
     * Ventas: se filtran por período si se indica
     * Fiados: siempre totales (histórico), no se filtran por fechas
     */
    async obtenerDatosParaVisualizacion(fechaInicio?: Date, fechaFin?: Date) {
        const ventaWhere = fechaInicio && fechaFin
            ? { fecha_venta: Between(fechaInicio, fechaFin) }
            : {};

        const [ventas, ventasConSaldo, cobros] = await Promise.all([
            this.ventaRepository.find({
                where: ventaWhere,
                order: { fecha_venta: 'DESC' }
            }),
            this.ventaRepository.find({ where: { saldo: true } }),
            this.obtenerCobrosRegistrados()
        ]);

        // Monto total de ventas
        const montoTotalVentas = ventas.reduce((sum, v) => sum + parseFloat(v.monto_total), 0);

        // Fiados: crédito otorgado (ventas con saldo) - cobros realizados
        const creditoOtorgado = ventasConSaldo.reduce(
            (sum, v) => sum + parseFloat(v.saldo_monto || '0'),
            0
        );
        const totalCobrado = cobros.reduce((sum, c) => sum + Number(c.monto), 0);
        const fiadoPendiente = Math.max(0, creditoOtorgado - totalCobrado);

        // Ventas por tipo
        const ventasPorTipo = {
            LOCAL: ventas.filter((v) => (v.tipo || 'LOCAL') === 'LOCAL').reduce((s, v) => s + parseFloat(v.monto_total), 0),
            REPARTIDOR: ventas.filter((v) => v.tipo === 'REPARTIDOR').reduce((s, v) => s + parseFloat(v.monto_total), 0),
            REVENDEDOR: ventas.filter((v) => v.tipo === 'REVENDEDOR').reduce((s, v) => s + parseFloat(v.monto_total), 0),
        };

        // Ventas por día (para gráficos)
        const ventasPorDia = ventas.reduce((acc, v) => {
            const fecha = new Date(v.fecha_venta).toISOString().split('T')[0];
            acc[fecha] = (acc[fecha] || 0) + parseFloat(v.monto_total);
            return acc;
        }, {} as Record<string, number>);

        // Ventas por medio de pago
        const ventasPorMedioPago = ventas.reduce(
            (acc, v) => {
                acc[v.medio_pago] = (acc[v.medio_pago] || 0) + parseFloat(v.monto_total);
                return acc;
            },
            {} as Record<string, number>
        );

        return {
            ventas: {
                total: ventas.length,
                montoTotal: Math.round(montoTotalVentas * 100) / 100,
                porTipo: ventasPorTipo,
                porDia: ventasPorDia,
                porMedioPago: ventasPorMedioPago,
            },
            fiados: {
                creditoOtorgado: Math.round(creditoOtorgado * 100) / 100,
                totalCobrado: Math.round(totalCobrado * 100) / 100,
                pendiente: Math.round(fiadoPendiente * 100) / 100,
                cantidadVentasConSaldo: ventasConSaldo.length,
            },
            cobros: {
                total: cobros.length,
                montoTotal: Math.round(totalCobrado * 100) / 100,
            },
            periodo: {
                inicio: fechaInicio?.toISOString() || null,
                fin: fechaFin?.toISOString() || null,
            },
        };
    }

    async eliminarVenta(ventaId: string): Promise<boolean> {
        const venta = await this.ventaRepository.findOne({
            where: { venta_id: ventaId }
        });

        if (!venta) {
            throw new Error('Venta no encontrada');
        }

        await this.ventaRepository.remove(venta);
        return true;
    }
} 