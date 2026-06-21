import { AppDataSource } from '../config/database';
import { Movimiento, TipoMovimiento } from '../entities/Movimiento';
import { Venta } from '../entities/Venta';
import { VentaCerrada } from '../entities/VentaCerrada';
import { Repartidor } from '../entities/Repartidor';

const TIPOS_INGRESO: TipoMovimiento[] = [
    TipoMovimiento.VENTA_LOCAL,
    TipoMovimiento.CIERRE_VENTA,
    TipoMovimiento.RENDICION,
    TipoMovimiento.COBRO_CLIENTE,
];

const PALABRAS_COMBUSTIBLE = ['nafta', 'combustible', 'ypf', 'gasoil', 'gas ', 'shell', 'axion'];

function parseMonto(val: unknown): number {
    const n = Number(val ?? 0);
    return Number.isFinite(n) ? Math.abs(n) : 0;
}

function toDateKey(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function parseDetalles(detalles: unknown): Record<string, unknown> {
    if (!detalles) return {};
    if (typeof detalles === 'string') {
        try {
            return JSON.parse(detalles) as Record<string, unknown>;
        } catch {
            return {};
        }
    }
    if (typeof detalles === 'object') {
        return detalles as Record<string, unknown>;
    }
    return {};
}

function normalizarCategoriaGasto(mov: Movimiento): string {
    const detalles = parseDetalles(mov.detalles);
    const categoria = (detalles.categoria as string) || 'Sin categoría';
    const concepto = (mov.descripcion || (detalles.concepto as string) || '').toLowerCase();

    if (categoria === 'Pago de haberes') return 'Sueldos';
    if (
        categoria.toLowerCase().includes('combustible') ||
        PALABRAS_COMBUSTIBLE.some((p) => concepto.includes(p))
    ) {
        return 'Combustible';
    }

    return categoria;
}

export interface ReporteCompleto {
    periodo: { fechaInicio: string; fechaFin: string };
    resumen: {
        totalIngresos: number;
        totalEgresos: number;
        balance: number;
        cantidadVentas: number;
        cantidadMovimientos: number;
    };
    ingresosPorCanal: {
        local: number;
        repartidor: number;
        revendedor: number;
        cobros: number;
        rendicion: number;
    };
    egresosPorCategoria: Array<{ categoria: string; monto: number; cantidad: number }>;
    serieTemporal: Array<{ fecha: string; ingresos: number; egresos: number }>;
    repartidores: Array<{
        id: number;
        nombre: string;
        totalVentas: number;
        gananciaRepartidor: number;
        gananciaEmpresa: number;
        cantidadCierres: number;
    }>;
    revendedores: Array<{
        nombre: string;
        totalVentas: number;
        cantidadVentas: number;
    }>;
    gastosDetalle: Array<{
        id: number;
        fecha: string;
        concepto: string;
        categoria: string;
        monto: number;
        proveedor: string;
    }>;
}

export class ReportesService {
    async obtenerReporteCompleto(fechaInicio: Date, fechaFin: Date): Promise<ReporteCompleto> {
        const inicio = new Date(fechaInicio);
        inicio.setHours(0, 0, 0, 0);
        const fin = new Date(fechaFin);
        fin.setHours(23, 59, 59, 999);

        const movimientoRepo = AppDataSource.getRepository(Movimiento);
        const ventaRepo = AppDataSource.getRepository(Venta);
        const ventaCerradaRepo = AppDataSource.getRepository(VentaCerrada);
        const repartidorRepo = AppDataSource.getRepository(Repartidor);

        const movimientos = await movimientoRepo
            .createQueryBuilder('mov')
            .select([
                'mov.id',
                'mov.tipo',
                'mov.monto',
                'mov.descripcion',
                'mov.detalles',
                'mov.fecha',
            ])
            .where('mov.fecha BETWEEN :inicio AND :fin', { inicio, fin })
            .andWhere('mov.activo = :activo', { activo: true })
            .orderBy('mov.fecha', 'ASC')
            .getMany();

        const ventas = await ventaRepo
            .createQueryBuilder('venta')
            .select([
                'venta.venta_id',
                'venta.tipo',
                'venta.monto_total',
                'venta.revendedor_nombre',
                'venta.fecha_venta',
            ])
            .where('venta.fecha_venta BETWEEN :inicio AND :fin', { inicio, fin })
            .getMany();

        const ventasCerradas = await ventaCerradaRepo
            .createQueryBuilder('vc')
            .leftJoin('vc.repartidor', 'repartidor')
            .select([
                'vc.id',
                'vc.repartidor_id',
                'vc.total_venta',
                'vc.ganancia_repartidor',
                'vc.ganancia_fabrica',
                'repartidor.id',
                'repartidor.nombre',
            ])
            .where('vc.fecha_cierre BETWEEN :inicio AND :fin', { inicio, fin })
            .getMany();

        const repartidores = await repartidorRepo.find({
            select: ['id', 'nombre'],
        });

        let totalIngresos = 0;
        let totalEgresos = 0;
        const ingresosPorCanal = {
            local: 0,
            repartidor: 0,
            revendedor: 0,
            cobros: 0,
            rendicion: 0,
        };
        const egresosMap = new Map<string, { monto: number; cantidad: number }>();
        const serieMap = new Map<string, { ingresos: number; egresos: number }>();
        const gastosDetalle: ReporteCompleto['gastosDetalle'] = [];

        for (const mov of movimientos) {
            const monto = parseMonto(mov.monto);
            const fechaKey = toDateKey(new Date(mov.fecha));

            if (!serieMap.has(fechaKey)) {
                serieMap.set(fechaKey, { ingresos: 0, egresos: 0 });
            }
            const serie = serieMap.get(fechaKey)!;

            if (mov.tipo === TipoMovimiento.GASTO) {
                totalEgresos += monto;
                serie.egresos += monto;

                const categoria = normalizarCategoriaGasto(mov);
                const prev = egresosMap.get(categoria) || { monto: 0, cantidad: 0 };
                egresosMap.set(categoria, {
                    monto: prev.monto + monto,
                    cantidad: prev.cantidad + 1,
                });

                const detalles = parseDetalles(mov.detalles);
                gastosDetalle.push({
                    id: mov.id,
                    fecha: new Date(mov.fecha).toISOString(),
                    concepto: mov.descripcion || (detalles.concepto as string) || 'Gasto',
                    categoria,
                    monto,
                    proveedor: (detalles.proveedor as string) || '',
                });
            } else if (TIPOS_INGRESO.includes(mov.tipo) && monto > 0) {
                totalIngresos += monto;
                serie.ingresos += monto;

                switch (mov.tipo) {
                    case TipoMovimiento.VENTA_LOCAL:
                        ingresosPorCanal.local += monto;
                        break;
                    case TipoMovimiento.CIERRE_VENTA:
                        ingresosPorCanal.repartidor += monto;
                        break;
                    case TipoMovimiento.COBRO_CLIENTE:
                        ingresosPorCanal.cobros += monto;
                        break;
                    case TipoMovimiento.RENDICION:
                        ingresosPorCanal.rendicion += monto;
                        break;
                }
            }
        }

        // Ventas por canal (tabla venta)
        for (const venta of ventas) {
            const monto = parseFloat(venta.monto_total) || 0;
            if (venta.tipo === 'REVENDEDOR') {
                ingresosPorCanal.revendedor += monto;
            }
        }

        const repartidorMap = new Map<number, ReporteCompleto['repartidores'][0]>();
        for (const rep of repartidores) {
            repartidorMap.set(rep.id, {
                id: rep.id,
                nombre: rep.nombre,
                totalVentas: 0,
                gananciaRepartidor: 0,
                gananciaEmpresa: 0,
                cantidadCierres: 0,
            });
        }

        for (const vc of ventasCerradas) {
            const repId = Number(vc.repartidor_id);
            if (!repartidorMap.has(repId)) {
                repartidorMap.set(repId, {
                    id: repId,
                    nombre: vc.repartidor?.nombre || `Repartidor #${repId}`,
                    totalVentas: 0,
                    gananciaRepartidor: 0,
                    gananciaEmpresa: 0,
                    cantidadCierres: 0,
                });
            }
            const entry = repartidorMap.get(repId)!;
            entry.totalVentas += parseMonto(vc.total_venta);
            entry.gananciaRepartidor += parseMonto(vc.ganancia_repartidor);
            entry.gananciaEmpresa += parseMonto(vc.ganancia_fabrica);
            entry.cantidadCierres += 1;
        }

        const revendedorMap = new Map<string, { totalVentas: number; cantidadVentas: number }>();
        for (const venta of ventas) {
            if (venta.tipo !== 'REVENDEDOR' || !venta.revendedor_nombre) continue;
            const nombre = venta.revendedor_nombre;
            const monto = parseFloat(venta.monto_total) || 0;
            const prev = revendedorMap.get(nombre) || { totalVentas: 0, cantidadVentas: 0 };
            revendedorMap.set(nombre, {
                totalVentas: prev.totalVentas + monto,
                cantidadVentas: prev.cantidadVentas + 1,
            });
        }

        const egresosPorCategoria = Array.from(egresosMap.entries())
            .map(([categoria, data]) => ({ categoria, ...data }))
            .sort((a, b) => b.monto - a.monto);

        const serieTemporal = Array.from(serieMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([fecha, valores]) => ({ fecha, ...valores }));

        const repartidoresReporte = Array.from(repartidorMap.values())
            .filter((r) => r.totalVentas > 0 || r.cantidadCierres > 0)
            .sort((a, b) => b.totalVentas - a.totalVentas);

        const revendedoresReporte = Array.from(revendedorMap.entries())
            .map(([nombre, data]) => ({ nombre, ...data }))
            .sort((a, b) => b.totalVentas - a.totalVentas);

        gastosDetalle.sort(
            (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );

        return {
            periodo: {
                fechaInicio: toDateKey(inicio),
                fechaFin: toDateKey(fin),
            },
            resumen: {
                totalIngresos: Math.round(totalIngresos * 100) / 100,
                totalEgresos: Math.round(totalEgresos * 100) / 100,
                balance: Math.round((totalIngresos - totalEgresos) * 100) / 100,
                cantidadVentas: ventas.length,
                cantidadMovimientos: movimientos.length,
            },
            ingresosPorCanal: {
                local: Math.round(ingresosPorCanal.local * 100) / 100,
                repartidor: Math.round(ingresosPorCanal.repartidor * 100) / 100,
                revendedor: Math.round(ingresosPorCanal.revendedor * 100) / 100,
                cobros: Math.round(ingresosPorCanal.cobros * 100) / 100,
                rendicion: Math.round(ingresosPorCanal.rendicion * 100) / 100,
            },
            egresosPorCategoria,
            serieTemporal,
            repartidores: repartidoresReporte,
            revendedores: revendedoresReporte,
            gastosDetalle,
        };
    }
}
