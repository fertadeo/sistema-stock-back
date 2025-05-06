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
        fecha?: string;
    }): Promise<Carga> {
        // Verificar que el repartidor existe
        await this.repartidorService.obtenerRepartidorPorId(data.repartidor_id.toString());

        // Crear la fecha correctamente
        let fechaCarga: Date;
        if (data.fecha) {
            // Si la fecha incluye hora, usarla tal cual
            if (data.fecha.includes('T')) {
                fechaCarga = new Date(data.fecha);
            } else {
                // Parsear la fecha manualmente para evitar problemas de zona horaria
                const [year, month, day] = data.fecha.split('-').map(Number);
                const fechaSeleccionada = new Date(year, month - 1, day);
                const hoy = new Date();
                
                // Comparar solo el día, mes y año
                const esHoy = fechaSeleccionada.getDate() === hoy.getDate() &&
                            fechaSeleccionada.getMonth() === hoy.getMonth() &&
                            fechaSeleccionada.getFullYear() === hoy.getFullYear();

                if (esHoy) {
                    // Si es hoy, usar la hora actual
                    fechaSeleccionada.setHours(hoy.getHours(), hoy.getMinutes(), hoy.getSeconds());
                } else {
                    // Si no es hoy, usar hora predeterminada (00:00:00)
                    fechaSeleccionada.setHours(0, 0, 0);
                }
                fechaCarga = fechaSeleccionada;
            }
        } else {
            // Si no se proporciona fecha, usar la fecha y hora actual
            fechaCarga = new Date();
        }

        // Verificar que la fecha es válida
        if (!(fechaCarga instanceof Date) || isNaN(fechaCarga.getTime())) {
            throw new Error('La fecha proporcionada no es válida');
        }

        const carga = this.cargaRepository.create({
            ...data,
            fecha_carga: fechaCarga,
            estado: 'pendiente'
        });

        return await this.cargaRepository.save(carga);
    }

    async obtenerCargasPorRepartidor(repartidorId: number): Promise<any[]> {
        const cargas = await this.cargaRepository.find({
            where: { repartidor_id: repartidorId },
            order: { fecha_carga: 'DESC' },
            relations: ['repartidor']
        });

        return cargas.map(carga => {
            const year = carga.fecha_carga.getFullYear();
            const month = String(carga.fecha_carga.getMonth() + 1).padStart(2, '0');
            const day = String(carga.fecha_carga.getDate()).padStart(2, '0');
            const hours = String(carga.fecha_carga.getHours()).padStart(2, '0');
            const minutes = String(carga.fecha_carga.getMinutes()).padStart(2, '0');
            const seconds = String(carga.fecha_carga.getSeconds()).padStart(2, '0');
            
            const fechaFormateada = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            
            return {
                ...carga,
                fecha_carga: fechaFormateada
            };
        });
    }

    async obtenerCarga(id: number): Promise<any> {
        const carga = await this.cargaRepository.findOne({
            where: { id },
            relations: ['repartidor']
        });

        if (!carga) {
            throw new Error('Carga no encontrada');
        }

        // Debug de la fecha
        console.log('Fecha original:', carga.fecha_carga);
        console.log('Fecha ISO:', carga.fecha_carga.toISOString());
        console.log('Fecha UTC:', carga.fecha_carga.toUTCString());
        console.log('Fecha Local:', carga.fecha_carga.toString());
        
        // Obtener los componentes de la fecha
        const year = carga.fecha_carga.getFullYear();
        const month = String(carga.fecha_carga.getMonth() + 1).padStart(2, '0');
        const day = String(carga.fecha_carga.getDate()).padStart(2, '0');
        const hours = String(carga.fecha_carga.getHours()).padStart(2, '0');
        const minutes = String(carga.fecha_carga.getMinutes()).padStart(2, '0');
        const seconds = String(carga.fecha_carga.getSeconds()).padStart(2, '0');
        
        const fechaFormateada = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        console.log('Fecha formateada manualmente:', fechaFormateada);
        
        return {
            ...carga,
            fecha_carga: fechaFormateada
        };
    }

    async actualizarEstadoCarga(id: number, estado: 'completada' | 'cancelada'): Promise<Carga> {
        const carga = await this.obtenerCarga(id);
        carga.estado = estado;
        return await this.cargaRepository.save(carga);
    }

    async obtenerCargasPendientesPorRepartidor(repartidorId: number): Promise<any[]> {
        const cargas = await this.cargaRepository.find({
            where: {
                repartidor_id: repartidorId,
                estado: 'pendiente'
            },
            relations: ['items', 'repartidor'],
            order: { fecha_carga: 'DESC' }
        });

        return cargas.map(carga => {
            const year = carga.fecha_carga.getFullYear();
            const month = String(carga.fecha_carga.getMonth() + 1).padStart(2, '0');
            const day = String(carga.fecha_carga.getDate()).padStart(2, '0');
            const hours = String(carga.fecha_carga.getHours()).padStart(2, '0');
            const minutes = String(carga.fecha_carga.getMinutes()).padStart(2, '0');
            const seconds = String(carga.fecha_carga.getSeconds()).padStart(2, '0');
            
            const fechaFormateada = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            
            return {
                ...carga,
                fecha_carga: fechaFormateada
            };
        });
    }

    async eliminarCargaPendiente(id: number): Promise<void> {
        const carga = await this.cargaRepository.findOne({
            where: { 
                id,
                estado: 'pendiente'
            }
        });

        if (!carga) {
            throw new Error('No se encontró la carga pendiente o ya ha sido completada');
        }

        await this.cargaRepository.remove(carga);
    }
} 