import { AppDataSource } from "../config/database";
import { Venta } from "../entities/Venta";
import { Between } from "typeorm";

export class VentaService {
    private ventaRepository = AppDataSource.getRepository(Venta);

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

        if (!ventaData.monto_total) {
            throw new Error('El monto total es requerido');
        }

        if (!['efectivo', 'transferencia'].includes(ventaData.medio_pago ?? '')) {
            throw new Error('Medio de pago inválido');
        }

        if (!['total', 'parcial'].includes(ventaData.forma_pago ?? '')) {
            throw new Error('Forma de pago inválida');
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
        return {
            efectivo: ventas.filter(v => v.medio_pago === 'efectivo').length,
            transferencia: ventas.filter(v => v.medio_pago === 'transferencia').length
        };
    }
} 