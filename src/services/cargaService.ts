import { AppDataSource } from "../config/database";
import { Carga } from "../entities/Carga";
import { RepartidorService } from "./repartidorService";

export class CargaService {
    private cargaRepository = AppDataSource.getRepository(Carga);
    private repartidorService = new RepartidorService();

    async crearCarga(data: {
        repartidor_id: number;
        items: {
            producto_id: number;
            cantidad: number;
            nombre_producto: string;
        }[];
    }): Promise<Carga> {
        // Verificar que el repartidor existe
        await this.repartidorService.obtenerRepartidorPorId(data.repartidor_id.toString());

        const carga = this.cargaRepository.create({
            ...data,
            fecha_carga: new Date(),
            estado: 'pendiente'
        });

        return await this.cargaRepository.save(carga);
    }

    async obtenerCargasPorRepartidor(repartidorId: number): Promise<Carga[]> {
        return await this.cargaRepository.find({
            where: { repartidor_id: repartidorId },
            order: { fecha_carga: 'DESC' },
            relations: ['repartidor']
        });
    }

    async obtenerCarga(id: number): Promise<Carga> {
        const carga = await this.cargaRepository.findOne({
            where: { id },
            relations: ['repartidor']
        });

        if (!carga) {
            throw new Error('Carga no encontrada');
        }

        return carga;
    }

    async actualizarEstadoCarga(id: number, estado: 'completada' | 'cancelada'): Promise<Carga> {
        const carga = await this.obtenerCarga(id);
        carga.estado = estado;
        return await this.cargaRepository.save(carga);
    }

    async obtenerCargasPendientesPorRepartidor(repartidorId: number): Promise<Carga[]> {
        return await this.cargaRepository.find({
            where: {
                repartidor_id: repartidorId,
                estado: 'pendiente'
            },
            relations: ['items', 'repartidor'],
            order: { fecha_carga: 'DESC' }
        });
    }
} 