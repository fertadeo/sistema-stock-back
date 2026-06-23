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
    if (subs.length === 0) return 0;

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
      } catch (error: unknown) {
        const status = (error as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await repo.delete({ id: sub.id });
        }
      }
    }

    return enviados;
  }
}

export const pushNotificationService = new PushNotificationService();
