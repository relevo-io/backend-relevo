import { ChatModel, IChat } from '../models/chatModel.js';
import { MensajeModel, IMensaje } from '../models/mensajeModel.js';
import { OfertaModel } from '../models/ofertaModel.js';
import { SolicitudModel } from '../models/solicitudModel.js';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: any = {
    $setOnInsert: {
      oferta: ofertaId,
      owner: ownerId,
      interested: interestedId,
      unreadOwner: 0,
      unreadInterested: 0,
      isReadOnly: false
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

export const obtenerMensajesPorChat = async (chatId: string, limit: number, before?: string): Promise<IMensaje[]> => {
  const filter: Record<string, unknown> = { chat: chatId };
  if (before) {
    filter['createdAt'] = { $lt: new Date(before) };
  }

  return await MensajeModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('sender', 'fullName email')
    .lean();
};

export const obtenerChatBasicoPorId = async (chatId: string): Promise<Partial<IChat> | null> => {
  return await ChatModel.findById(chatId).select('owner interested isReadOnly status').lean();
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

export const guardarMensaje = async (chatId: string, senderId: string, content: string): Promise<IMensaje> => {
  return await MensajeModel.create({
    chat: chatId,
    sender: senderId,
    content
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
  return await MensajeModel.findById(mensajeId).populate('sender', 'fullName').lean();
};
