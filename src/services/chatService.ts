import mongoose, { Types } from 'mongoose';
import { ChatModel, IChat, ChatStatus, PostCloseGuidanceDecision } from '../models/chatModel.js';
import { MensajeModel, IMensaje } from '../models/mensajeModel.js';
import { OfertaModel } from '../models/ofertaModel.js';
import { SolicitudModel } from '../models/solicitudModel.js';
import { logger } from '../config.js';

export const verificarOfertaYObtenerPropietario = async (ofertaId: string): Promise<string | null> => {
  const oferta = await OfertaModel.findById(ofertaId).select('owner').lean();
  return oferta ? String(oferta.owner) : null;
};

export const existeSolicitudAceptada = async (ofertaId: string, interestedId: string): Promise<boolean> => {
  const solicitud = await SolicitudModel.findOne({
    opportunity: ofertaId,
    interestedUser: interestedId,
    status: 'ACCEPTED'
  }).lean();
  return !!solicitud;
};

export const crearOObtenerChat = async (
  ofertaId: string,
  ownerId: string,
  interestedId: string,
  solicitudAceptada: boolean
): Promise<IChat> => {
  const update: mongoose.UpdateQuery<IChat> & {
    $setOnInsert: {
      oferta: Types.ObjectId;
      owner: Types.ObjectId;
      interested: Types.ObjectId;
      unreadOwner: number;
      unreadInterested: number;
      isReadOnly: boolean;
      closedByOwner: boolean;
      closedByInterested: boolean;
      postCloseGuidanceOwnerDecision: PostCloseGuidanceDecision;
      postCloseGuidanceInterestedDecision: PostCloseGuidanceDecision;
      status?: ChatStatus;
    };
  } = {
    $setOnInsert: {
      oferta: new Types.ObjectId(ofertaId),
      owner: new Types.ObjectId(ownerId),
      interested: new Types.ObjectId(interestedId),
      unreadOwner: 0,
      unreadInterested: 0,
      isReadOnly: false,
      closedByOwner: false,
      closedByInterested: false,
      postCloseGuidanceOwnerDecision: 'PENDING',
      postCloseGuidanceInterestedDecision: 'PENDING'
    }
  };

  if (solicitudAceptada) {
    update.$set = { status: 'APPROVED' };
  } else {
    update.$setOnInsert.status = 'PENDING_APPROVAL';
  }

  return await ChatModel.findOneAndUpdate({ oferta: ofertaId, interested: interestedId }, update, {
    upsert: true,
    new: true,
    runValidators: true
  })
    .populate('owner', 'fullName email')
    .populate('interested', 'fullName email');
};

import { generarPresignedGet } from './storageService.js';

const populateFileUrl = async (mensaje: IMensaje | null): Promise<IMensaje | null> => {
  if (!mensaje) return null;
  if (mensaje.s3Key) {
    try {
      mensaje.fileUrl = await generarPresignedGet(mensaje.s3Key);
    } catch (err) {
      logger.error({ err, s3Key: mensaje.s3Key }, '[ChatService] Error generating presigned GET URL');
    }
  }
  return mensaje;
};

const populateFileUrls = async (mensajes: IMensaje[]): Promise<IMensaje[]> => {
  return await Promise.all(mensajes.map((m) => populateFileUrl(m) as Promise<IMensaje>));
};

export const obtenerChatsPorUsuario = async (userId: string): Promise<IChat[]> => {
  return await ChatModel.find({
    $or: [{ owner: userId }, { interested: userId }]
  })
    .sort({ updatedAt: -1 })
    .populate('owner', 'fullName email')
    .populate('oferta', 'sector region companyDescription')
    .populate('interested', 'fullName email')
    .lean();
};

export const obtenerChatDetalladoPorId = async (chatId: string): Promise<IChat | null> => {
  return await ChatModel.findById(chatId)
    .populate('owner', 'fullName email')
    .populate('oferta', 'sector region companyDescription')
    .populate('interested', 'fullName email')
    .lean();
};

export const obtenerMensajesPorChat = async (chatId: string, limit: number, before?: string): Promise<IMensaje[]> => {
  const filter: Record<string, unknown> = { chat: chatId };
  if (before) {
    filter['createdAt'] = { $lt: new Date(before) };
  }

  const mensajes = await MensajeModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('sender', 'fullName email')
    .lean();

  return await populateFileUrls(mensajes);
};

export const obtenerChatBasicoPorId = async (chatId: string): Promise<Partial<IChat> | null> => {
  return await ChatModel.findById(chatId)
    .select(
      'owner interested isReadOnly status closedByOwner closedByInterested closedAt postCloseGuidanceOwnerDecision postCloseGuidanceInterestedDecision'
    )
    .lean();
};

export const resetearContadorNoLeidos = async (chatId: string, resetField: Record<string, unknown>): Promise<void> => {
  await ChatModel.findByIdAndUpdate(chatId, { $set: resetField });
};

export const marcarChatSoloLectura = async (chatId: string): Promise<void> => {
  await ChatModel.findByIdAndUpdate(chatId, { $set: { isReadOnly: true } });
};

export const actualizarEstadoChat = async (chatId: string, status: string): Promise<IChat | null> => {
  return await ChatModel.findByIdAndUpdate(chatId, { $set: { status } }, { new: true }).populate(
    'owner interested oferta'
  );
};

export const actualizarEstadoChatPorOfertaEInteresado = async (
  ofertaId: string,
  interestedId: string,
  status: ChatStatus
): Promise<IChat | null> => {
  return await ChatModel.findOneAndUpdate(
    { oferta: ofertaId, interested: interestedId },
    { $set: { status } },
    { new: true }
  )
    .populate('owner', 'fullName email')
    .populate('interested', 'fullName email')
    .populate('oferta', 'sector region companyDescription')
    .lean();
};

export const cerrarVentaChat = async (chatId: string, userId: string): Promise<IChat | null> => {
  const chat = await ChatModel.findById(chatId).select('owner interested closedByOwner closedByInterested').lean();
  if (!chat) return null;

  const isOwner = String(chat.owner) === userId;
  const isInterested = String(chat.interested) === userId;
  if (!isOwner && !isInterested) return null;

  const closedByOwner = isOwner ? true : Boolean(chat.closedByOwner);
  const closedByInterested = isInterested ? true : Boolean(chat.closedByInterested);
  const setFields: Partial<IChat> = {
    closedByOwner,
    closedByInterested
  };

  if (closedByOwner && closedByInterested) {
    setFields.closedAt = new Date();
    setFields.isReadOnly = true;
  }

  return await ChatModel.findByIdAndUpdate(chatId, { $set: setFields }, { new: true, runValidators: true })
    .populate('owner', 'fullName email')
    .populate('interested', 'fullName email')
    .populate('oferta', 'sector region companyDescription')
    .lean();
};

export const registrarDecisionGuiadoPostCierre = async (
  chatId: string,
  userId: string,
  decision: Exclude<PostCloseGuidanceDecision, 'PENDING'>
): Promise<IChat | null> => {
  const chat = await ChatModel.findById(chatId).select('owner interested').lean();
  if (!chat) return null;

  const isOwner = String(chat.owner) === userId;
  const isInterested = String(chat.interested) === userId;
  if (!isOwner && !isInterested) return null;

  const setFields: Partial<IChat> = isOwner
    ? { postCloseGuidanceOwnerDecision: decision }
    : { postCloseGuidanceInterestedDecision: decision };

  return await ChatModel.findByIdAndUpdate(chatId, { $set: setFields }, { new: true, runValidators: true })
    .populate('owner', 'fullName email')
    .populate('interested', 'fullName email')
    .populate('oferta', 'sector region companyDescription')
    .lean();
};

export const guardarMensaje = async (
  chatId: string,
  senderId: string,
  content: string,
  extraData?: Partial<IMensaje>
): Promise<IMensaje> => {
  return await MensajeModel.create({
    chat: chatId,
    sender: senderId,
    content,
    ...extraData
  });
};

export const actualizarChatConNuevoMensaje = async (
  chatId: string,
  unreadUpdate: Record<string, unknown>,
  content: string,
  senderId: string,
  sentAt: Date
): Promise<void> => {
  await ChatModel.findByIdAndUpdate(chatId, {
    $inc: unreadUpdate,
    lastMessage: { content, senderId, sentAt }
  });
};

export const obtenerMensajePoblado = async (mensajeId: string): Promise<IMensaje | null> => {
  const msg = await MensajeModel.findById(mensajeId).populate('sender', 'fullName').lean();
  return await populateFileUrl(msg);
};
