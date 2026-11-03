import { AppDataSource } from "../config/database";
import { Repartidor } from "../entities/Repartidor";
import { REPARTIDOR_PIN_COLORS } from "../constants/repartidorPinColors";

function normalizarColorPin(value: unknown): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') {
        throw new Error('color_pin inválido');
    }
    const color = value.trim();
    if (!color) return null;
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        throw new Error('color_pin debe ser un hex #RRGGBB');
    }
    return color.toUpperCase();
}

export class RepartidorService {
    private repartidorRepository = AppDataSource.getRepository(Repartidor);

    async siguienteColorPin(): Promise<string> {
        const existentes = await this.repartidorRepository.find({
            select: ['color_pin'],
        });
        const usados = new Set(
            existentes
                .map((r) => (r.color_pin || '').trim().toUpperCase())
                .filter(Boolean)
        );
        for (const color of REPARTIDOR_PIN_COLORS) {
            if (!usados.has(color.toUpperCase())) return color;
        }
        return REPARTIDOR_PIN_COLORS[existentes.length % REPARTIDOR_PIN_COLORS.length];
    }

    async crearRepartidor(data: Partial<Repartidor>): Promise<Repartidor> {
        const colorElegido = normalizarColorPin(data.color_pin);
        const color_pin = colorElegido || (await this.siguienteColorPin());
        const repartidor = this.repartidorRepository.create({
            ...data,
            color_pin,
        });
        return await this.repartidorRepository.save(repartidor);
    }

  async obtenerRepartidores(incluirInactivos = false) {
    return await this.repartidorRepository.find({
      where: incluirInactivos ? {} : { activo: true },
      order: { fecha_registro: 'DESC' },
    });
  }

    async obtenerRepartidorPorId(id: string | number): Promise<Repartidor> {
        const repartidor = await this.repartidorRepository.findOne({
            where: { id: Number(id) }
        });

        if (!repartidor) {
            throw new Error('Repartidor no encontrado');
        }

        return repartidor;
    }

    async actualizarRepartidor(id: string, data: Partial<Repartidor>): Promise<Repartidor> {
        const repartidor = await this.obtenerRepartidorPorId(id);

        const { color_pin, ...resto } = data;
        Object.assign(repartidor, resto);

        if (color_pin !== undefined) {
            const normalizado = normalizarColorPin(color_pin);
            repartidor.color_pin = normalizado ?? null;
        }

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