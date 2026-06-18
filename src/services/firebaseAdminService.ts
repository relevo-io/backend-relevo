import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import { config, logger } from '../config.js';
import { UsuarioModel } from '../models/usuarioModel.js';

let firebaseApp: App | null = null;

export const getFirebaseApp = (): App => {
  if (firebaseApp) return firebaseApp;
  const existingDefault = getApps().find((app) => app.name === '[default]');
  if (existingDefault) {
    firebaseApp = existingDefault;
    return firebaseApp;
  }

  firebaseApp = initializeApp({
    credential: cert({
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      privateKey: config.firebase.privateKey
    })
  });

  return firebaseApp;
};

export const verifyFirebaseIdToken = async (idToken: string) => {
  const app = getFirebaseApp();
  return getAuth(app).verifyIdToken(idToken);
};

export const sendPushNotification = async (
  userId: string,
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> => {
  if (!tokens || tokens.length === 0) return;

  const app = getFirebaseApp();
  const messaging = getMessaging(app);

  try {
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data,
      webpush: {
        notification: {
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        }
      }
    });

    const tokensToRemove: string[] = [];
    response.responses.forEach((res, idx) => {
      if (!res.success && res.error) {
        const code = res.error.code;
        if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-argument') {
          tokensToRemove.push(tokens[idx]!);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      logger.info('Limpiando %d tokens FCM obsoletos para el usuario %s', tokensToRemove.length, userId);
      await UsuarioModel.findByIdAndUpdate(userId, {
        $pull: { fcmTokens: { $in: tokensToRemove } }
      });
    }
  } catch (error) {
    logger.error({ error }, 'Error al enviar notificaciones multicast FCM');
  }
};
