import webpush from 'web-push';
import { AppDataSource } from '../config/database';
import { PushSubscription } from '../entities/PushSubscription';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

class PushNotificationService {
  private configurado = false;

  constructor() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'https://sistema.soderiadonjavier.com';

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.configurado = true;
    }
  }

  estaConfigurado(): boolean {
    return this.configurado;
  }

  getPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
  }

  async enviarAPushUsuario(userId: number, payload: PushPayload): Promise<number> {
    if (!this.configurado) return 0;

    const repo = AppDataSource.getRepository(PushSubscription);
    const subs = await repo.find({ where: { user_id: userId } });
    if (subs.length === 0) {
      console.warn(`[push] Usuario ${userId} sin suscripciones push activas`);
      return 0;
    }

    const body = JSON.stringify(payload);
    let enviados = 0;

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
        enviados += 1;
        console.log(`[push] Notificación enviada a usuario ${userId}`);
      } catch (error: unknown) {
        const status = (error as { statusCode?: number })?.statusCode;
        console.error(`[push] Error enviando a usuario ${userId}:`, status, error);
        if (status === 404 || status === 410) {
          await repo.delete({ id: sub.id });
        }
      }
    }

    return enviados;
  }

  async usuarioTieneSuscripcion(userId: number): Promise<boolean> {
    const repo = AppDataSource.getRepository(PushSubscription);
    const count = await repo.count({ where: { user_id: userId } });
    return count > 0;
  }

  async enviarPrueba(userId: number): Promise<number> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://sistema.soderiadonjavier.com';
    return this.enviarAPushUsuario(userId, {
      title: 'Prueba de alertas Sodería',
      body: 'Si ves esto, las notificaciones push están funcionando.',
      url: `${frontendUrl}/repartidor/ruta`,
    });
  }
}

export const pushNotificationService = new PushNotificationService();
