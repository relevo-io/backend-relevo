import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import { ChatModel } from '../models/chatModel.js';
import { MensajeModel } from '../models/mensajeModel.js';
import { OfertaModel } from '../models/ofertaModel.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/AppError.js';
import { SolicitudModel } from '../models/solicitudModel.js';

// ─────────────────────────────────────────────
//  POST /api/chats
//  Crea o recupera un chat existente para (oferta + interesado)
// ─────────────────────────────────────────────
export const getOrCreateChat = async (req: AuthRequest, res: Response) => {
  const callerId = req.user!.id;
  const { ofertaId, interestedId } = req.body;

  if (!ofertaId) {
    throw new ValidationError('ofertaId es requerido');
  }

  // Verificar que la oferta existe
  const oferta = await OfertaModel.findById(ofertaId).select('owner').lean();
  if (!oferta) {
    throw new NotFoundError('Oferta no encontrada');
  }

  const isCallerOwner = String(oferta.owner) === String(callerId);

  // Determinar quién es el interesado:
  // - Si el que llama es el dueño, debe haber pasado el ID del interesado.
  // - Si el que llama no es el dueño, el interesado es él mismo.
  const targetInterestedId = isCallerOwner ? interestedId : callerId;

  if (!targetInterestedId) {
    throw new ValidationError('interestedId es requerido cuando el propietario inicia el chat');
  }

  if (String(oferta.owner) === String(targetInterestedId)) {
    throw new ForbiddenError('No puedes iniciar un chat contigo mismo');
  }

  // VERIFICACIÓ: Si existeix una sol·licitud ACCEPTADA, el xat s'aprova automàticament
  const solicitudAceptada = await SolicitudModel.findOne({
    opportunity: ofertaId,
    interestedUser: targetInterestedId,
    status: 'ACCEPTED'
  }).lean();

  // Upsert: un solo chat por par (oferta + interested)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: any = {
    $setOnInsert: {
      oferta: ofertaId,
      owner: oferta.owner,
      interested: targetInterestedId,
      unreadOwner: 0,
      unreadInterested: 0,
      isReadOnly: false
    }
  };

  if (solicitudAceptada) {
    // Si està acceptada, volem que sigui APPROVED tant si és nou com si ja existia
    update.$set = { status: 'APPROVED' };
  } else {
    // Si no està acceptada, només el marquem com a PENDING_APPROVAL si és la primera vegada
    update.$setOnInsert.status = 'PENDING_APPROVAL';
  }

  const chat = await ChatModel.findOneAndUpdate({ oferta: ofertaId, interested: targetInterestedId }, update, {
    upsert: true,
    new: true,
    runValidators: true
  })
    .populate('owner', 'fullName email')
    .populate('interested', 'fullName email');

  const statusCode = chat.createdAt?.getTime() === chat.updatedAt?.getTime() ? 201 : 200;
  res.status(statusCode).json(chat);
};

// ─────────────────────────────────────────────
//  GET /api/chats
//  Mis chats activos (como owner o como interested)
// ─────────────────────────────────────────────
export const getMyChats = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const chats = await ChatModel.find({
    $or: [{ owner: userId }, { interested: userId }]
  })
    .sort({ updatedAt: -1 })
    .populate('owner', 'fullName email')
    .populate('interested', 'fullName email')
    .populate('oferta', 'sector region companyDescription')
    .lean();

  res.status(200).json(chats);
};

// ─────────────────────────────────────────────
//  GET /api/chats/:chatId/messages
//  Historial con paginación por cursor temporal
//  Query params: ?limit=30&before=<ISO_date>
// ─────────────────────────────────────────────
export const getChatMessages = async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;
  const limit = Math.min(parseInt(req.query['limit'] as string) || 30, 100);
  const before = req.query['before'] as string | undefined;

  const filter: Record<string, unknown> = { chat: chatId };
  if (before) {
    filter['createdAt'] = { $lt: new Date(before) };
  }

  const mensajes = await MensajeModel.find(filter)
    .sort({ createdAt: -1 }) // más recientes primero
    .limit(limit)
    .populate('sender', 'fullName email')
    .lean();

  // Return in chronological order (oldest first) for UI rendering
  res.status(200).json(mensajes.reverse());
};

// ─────────────────────────────────────────────
//  PATCH /api/chats/:chatId/read
//  Marca los mensajes como leídos (reset unread counter)
// ─────────────────────────────────────────────
export const markChatAsRead = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { chatId } = req.params;

  const chat = await ChatModel.findById(chatId).select('owner interested').lean();
  if (!chat) {
    throw new NotFoundError('Chat no encontrado');
  }

  const isOwner = String(chat.owner) === userId;
  const isInterested = String(chat.interested) === userId;

  if (!isOwner && !isInterested) {
    throw new ForbiddenError('No autorizado');
  }

  const resetField = isOwner ? { unreadOwner: 0 } : { unreadInterested: 0 };
  await ChatModel.findByIdAndUpdate(chatId, { $set: resetField });

  res.status(200).json({ ok: true });
};

// ─────────────────────────────────────────────
//  PATCH /api/chats/:chatId/readonly
//  Marca un chat como solo lectura (llamado cuando se borra una oferta)
//  Solo el owner o admin puede hacerlo
// ─────────────────────────────────────────────
export const setChatReadOnly = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { chatId } = req.params;

  const chat = await ChatModel.findById(chatId).select('owner').lean();
  if (!chat) {
    throw new NotFoundError('Chat no encontrado');
  }

  const isOwner = String(chat.owner) === userId;
  const isAdmin = req.user!.roles.includes('ADMIN');

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError('No autorizado');
  }

  await ChatModel.findByIdAndUpdate(chatId, { $set: { isReadOnly: true } });
  res.status(200).json({ ok: true });
};

// ─────────────────────────────────────────────
//  PATCH /api/chats/:chatId/status
//  Permite al receptor (owner) aceptar o rechazar un chat pendiente
// ─────────────────────────────────────────────
export const updateChatStatus = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { chatId } = req.params;
  const { status } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    throw new ValidationError('Estado no válido');
  }

  const chat = await ChatModel.findById(chatId).select('owner').lean();
  if (!chat) {
    throw new NotFoundError('Chat no encontrado');
  }

  // Solo el owner puede aprobar un chat iniciado por un interesado
  if (String(chat.owner) !== userId) {
    throw new ForbiddenError('No autorizado para cambiar el estado del xat');
  }

  const updated = await ChatModel.findByIdAndUpdate(chatId, { $set: { status } }, { new: true }).populate(
    'owner interested oferta'
  );

  res.status(200).json(updated);
};
