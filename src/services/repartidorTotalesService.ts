import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Clientes } from "../entities/Clientes";
import { EnvasesPrestados } from "../entities/EnvasesPrestados";

export class RepartidorTotalesService {
    /**
     * Obtiene los totales agregados de productos y envases para todos los clientes de un repartidor
     * @param repartidorNombre Nombre del repartidor
     * @returns Objeto con totales de envases por producto y resumen de envases propios de clientes
     */
    async obtenerTotalesPorRepartidor(repartidorNombre: string) {
        const clienteRepository = AppDataSource.getRepository(Clientes);
        const envaseRepository = AppDataSource.getRepository(EnvasesPrestados);

        // Obtener todos los clientes del repartidor
        const clientes = await clienteRepository.find({
            where: { repartidor: repartidorNombre },
            select: ['id', 'nombre', 'bidon_propio', 'sifones_propios']
        });

        if (clientes.length === 0) {
            return {
                repartidor: repartidorNombre,
                total_clientes: 0,
                envases_prestados: [],
                envases_propios: {
                    bidones: 0,
                    sifones: 0
                },
                total_envases_prestados: 0
            };
        }

        const clienteIds = clientes.map(c => c.id);

        // Obtener todos los envases prestados de estos clientes y agrupar
        const envasesAgregados = await envaseRepository
            .createQueryBuilder('envase')
            .select('envase.producto_id', 'producto_id')
            .addSelect('envase.producto_nombre', 'producto_nombre')
            .addSelect('envase.capacidad', 'capacidad')
            .addSelect('SUM(envase.cantidad)', 'cantidad_total')
            .where('envase.cliente_id IN (:...clienteIds)', { clienteIds })
            .groupBy('envase.producto_id')
            .addGroupBy('envase.producto_nombre')
            .addGroupBy('envase.capacidad')
            .orderBy('producto_nombre', 'ASC')
            .getRawMany();

        // Calcular totales de envases propios
        const totalesEnvasesPropios = clientes.reduce(
            (acc, cliente) => {
                acc.bidones += cliente.bidon_propio ? 1 : 0;
                acc.sifones += cliente.sifones_propios || 0;
                return acc;
            },
            { bidones: 0, sifones: 0 }
        );

        // Calcular total de envases prestados
        const totalEnvasesPrestados = envasesAgregados.reduce(
            (sum, item) => sum + parseInt(item.cantidad_total || '0', 10),
            0
        );

        return {
            repartidor: repartidorNombre,
            total_clientes: clientes.length,
            envases_prestados: envasesAgregados.map(e => ({
                producto_id: e.producto_id,
                producto_nombre: e.producto_nombre,
                capacidad: e.capacidad,
                cantidad_total: parseInt(e.cantidad_total || '0', 10)
            })),
            envases_propios: totalesEnvasesPropios,
            total_envases_prestados: totalEnvasesPrestados
        };
    }

    /**
     * Obtiene totales para todos los repartidores activos
     */
    async obtenerTotalesTodosRepartidores() {
        const clienteRepository = AppDataSource.getRepository(Clientes);

        // Obtener todos los repartidores únicos que tienen clientes
        const repartidores = await clienteRepository
            .createQueryBuilder('cliente')
            .select('DISTINCT cliente.repartidor', 'repartidor')
            .where('cliente.repartidor IS NOT NULL')
            .andWhere("cliente.repartidor != ''")
            .getRawMany();

        const totalesPorRepartidor = await Promise.all(
            repartidores.map(r => this.obtenerTotalesPorRepartidor(r.repartidor))
        );

        return totalesPorRepartidor;
    }
}
