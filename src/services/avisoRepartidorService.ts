import { AppDataSource } from '../config/database';
import { AvisoRepartidor } from '../entities/AvisoRepartidor';
import { User } from '../entities/User';
import { USER_ROLES } from '../constants/roles';
import { pushNotificationService } from './pushNotificationService';

function formatearMonto(monto: number): string {
  return monto.toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export class AvisoRepartidorService {
  private repo = AppDataSource.getRepository(AvisoRepartidor);

  async crearCobroHistorico(input: {
    repartidor_dueno_id: number;
    cobrado_por_repartidor_id: number;
    cobrado_por_nombre: string;
    cliente_id: number;
    cliente_nombre: string;
    cobro_id: number;
    monto: number;
  }) {
    const montoTxt = formatearMonto(input.monto);
    const aviso = await this.repo.save(
      this.repo.create({
        repartidor_id: input.repartidor_dueno_id,
        tipo: 'cobro_historico',
        titulo: 'Cobro de históricos',
        mensaje: `${input.cobrado_por_nombre} ha cobrado $${montoTxt} de tus históricos (${input.cliente_nombre}).`,
        monto: input.monto,
        cliente_id: input.cliente_id,
        cobro_id: input.cobro_id,
        cobrado_por_repartidor_id: input.cobrado_por_repartidor_id,
        leido: false,
      })
    );

    if (pushNotificationService.estaConfigurado()) {
      const user = await AppDataSource.getRepository(User).findOne({
        where: {
          repartidor_id: String(input.repartidor_dueno_id),
          role: USER_ROLES.REPARTIDOR,
          activo: true,
        },
      });
      if (user) {
        const frontendUrl = (
          process.env.FRONTEND_URL || 'https://sistema.soderiadonjavier.com'
        ).replace(/\/+$/, '');
        await pushNotificationService.enviarAPushUsuario(user.id, {
          title: 'Cobro de tus históricos',
          body: aviso.mensaje,
          url: `${frontendUrl}/repartidor`,
        });
      }
    }

    return aviso;
  }

  async listarPorRepartidor(repartidorId: number, soloNoLeidos = false) {
    const where: { repartidor_id: number; leido?: boolean } = {
      repartidor_id: repartidorId,
    };
    if (soloNoLeidos) where.leido = false;

    return this.repo.find({
      where,
      order: { creado_at: 'DESC' },
      take: 50,
    });
  }

  async contarNoLeidos(repartidorId: number) {
    return this.repo.count({
      where: { repartidor_id: repartidorId, leido: false },
    });
  }

  async marcarLeido(avisoId: number, repartidorId: number) {
    const aviso = await this.repo.findOne({
      where: { id: avisoId, repartidor_id: repartidorId },
    });
    if (!aviso) throw new Error('Aviso no encontrado');
    aviso.leido = true;
    return this.repo.save(aviso);
  }

  async marcarTodosLeidos(repartidorId: number) {
    await this.repo.update(
      { repartidor_id: repartidorId, leido: false },
      { leido: true }
    );
    return { ok: true };
  }
}

export const avisoRepartidorService = new AvisoRepartidorService();
