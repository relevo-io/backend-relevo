import { NotificacionModel } from '../models/notificacionModel.js';
import { sendPushNotification } from './firebaseAdminService.js';
import { UsuarioModel } from '../models/usuarioModel.js';
import { io } from '../sockets/socketServer.js';
import { logger } from '../config.js';

/**
 * Crea una notificación en la base de datos y envía opcionalmente una notificación push vía FCM
 * y una actualización en tiempo real mediante Socket.io.
 *
 * @param userId ID del destinatario
 * @param title Título de la notificación
 * @param body Cuerpo o mensaje de la notificación
 * @param type Tipo de notificación ('chat' | 'solicitud' | 'cv_analysis')
 * @param metadata Metadatos opcionales para navegación en el frontend
 * @param preferenceKey Clave de preferencia de usuario a comprobar
 * @param skipPush Si es true, omite el push (ej. si el usuario está en el chat activo)
 */
export const createNotificationAndSendPush = async (
  userId: string,
  title: string,
  body: string,
  type: 'chat' | 'solicitud' | 'cv_analysis',
  metadata?: Record<string, string>,
  preferenceKey?: 'newMessages' | 'applicationStatus' | 'newApplications' | 'cvAnalysis',
  skipPush: boolean = false
): Promise<void> => {
  try {
    const user = await UsuarioModel.findById(userId).select('fcmTokens notificationPreferences').lean();
    if (!user) {
      logger.warn('Intento de enviar notificación a usuario no existente: %s', userId);
      return;
    }

    // Comprobar preferencias de notificación del usuario
    const showNotification = preferenceKey ? user.notificationPreferences?.[preferenceKey] !== false : true;
    if (!showNotification) {
      logger.info('Notificación omitida para el usuario %s por preferencia desactivada: %s', userId, preferenceKey);
      return;
    }

    // 1. Guardar la notificación en la Base de Datos (historial interno)
    const dbNotif = await NotificacionModel.create({
      userId,
      title,
      body,
      type,
      metadata,
      read: false
    });

    // 2. Emitir notificación en tiempo real vía Socket.io a la sala personal del usuario
    if (io) {
      io.to(`user:${userId}`).emit('new_notification', dbNotif);
      logger.info('[Socket] Evento new_notification emitido a user:%s', userId);
    }

    // 3. Si tiene tokens de FCM y no hay orden de omitir el push, enviamos la notificación push real
    if (user.fcmTokens && user.fcmTokens.length > 0 && !skipPush) {
      const pushData = {
        ...metadata,
        notificationId: dbNotif._id!.toString(),
        type
      };

      await sendPushNotification(userId, user.fcmTokens, title, body, pushData).catch((err) =>
        logger.error({ err }, 'Error al enviar Push Notification mediante Firebase')
      );
    }
  } catch (error) {
    logger.error({ error, userId, title }, 'Error en el flujo unificado createNotificationAndSendPush');
  }
};
