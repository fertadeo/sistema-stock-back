import { AppDataSource } from "../config/database";
import { Repartidor } from "../entities/Repartidor";

export class RepartidorService {
    private repartidorRepository = AppDataSource.getRepository(Repartidor);

    async crearRepartidor(data: Partial<Repartidor>): Promise<Repartidor> {
        const repartidor = this.repartidorRepository.create(data);
        return await this.repartidorRepository.save(repartidor);
    }

    async obtenerRepartidores() {
        return await this.repartidorRepository.find({
            where: { activo: true },
            order: { fecha_registro: 'DESC' }
        });
    }

    async obtenerRepartidorPorId(id: string): Promise<Repartidor> {
        const repartidor = await this.repartidorRepository.findOne({
            where: { id }
        });

        if (!repartidor) {
            throw new Error('Repartidor no encontrado');
        }

        return repartidor;
    }

    async actualizarRepartidor(id: string, data: Partial<Repartidor>): Promise<Repartidor> {
        const repartidor = await this.obtenerRepartidorPorId(id);
        
        Object.assign(repartidor, data);
        
        return await this.repartidorRepository.save(repartidor);
    }

    async eliminarRepartidor(id: string): Promise<void> {
        const repartidor = await this.obtenerRepartidorPorId(id);
        repartidor.activo = false;
        await this.repartidorRepository.save(repartidor);
    }

    async obtenerRepartidoresPorZona(zona: string): Promise<Repartidor[]> {
        return await this.repartidorRepository.find({
            where: { 
                zona_reparto: zona,
                activo: true 
            }
        });
    }
} 