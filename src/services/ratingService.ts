import { Types } from 'mongoose';
import { ChatModel, IChat } from '../models/chatModel.js';
import { IRating, RatingModel, RatingRole } from '../models/ratingModel.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/AppError.js';

export interface RatingSummary {
  average: number;
  count: number;
}

export interface MyRatingsResponse {
  asOwner: RatingSummary;
  asInterested: RatingSummary;
  ratings: IRating[];
}

const emptySummary: RatingSummary = { average: 0, count: 0 };

export const obtenerResumenRating = async (userId: string, role: RatingRole): Promise<RatingSummary> => {
  const result = await RatingModel.aggregate<{ _id: null; average: number; count: number }>([
    { $match: { toUser: new Types.ObjectId(userId), ratedRole: role } },
    { $group: { _id: null, average: { $avg: '$score' }, count: { $sum: 1 } } }
  ]);

  if (!result[0]) return emptySummary;
  return { average: Number(result[0].average.toFixed(1)), count: result[0].count };
};

export const obtenerResumenRatingsPorUsuarios = async (
  userIds: string[],
  role: RatingRole
): Promise<Map<string, RatingSummary>> => {
  const objectIds = userIds.filter(Boolean).map((id) => new Types.ObjectId(id));
  if (objectIds.length === 0) return new Map();

  const result = await RatingModel.aggregate<{ _id: Types.ObjectId; average: number; count: number }>([
    { $match: { toUser: { $in: objectIds }, ratedRole: role } },
    { $group: { _id: '$toUser', average: { $avg: '$score' }, count: { $sum: 1 } } }
  ]);

  return new Map(
    result.map((item) => [String(item._id), { average: Number(item.average.toFixed(1)), count: item.count }])
  );
};

export const obtenerMisRatings = async (userId: string): Promise<MyRatingsResponse> => {
  const [asOwner, asInterested, ratings] = await Promise.all([
    obtenerResumenRating(userId, 'OWNER'),
    obtenerResumenRating(userId, 'INTERESTED'),
    RatingModel.find({ toUser: userId })
      .populate('fromUser', 'fullName')
      .populate('chat', 'oferta closedAt')
      .sort({ createdAt: -1 })
      .lean()
  ]);

  return { asOwner, asInterested, ratings };
};

export const obtenerMiRatingDeChat = async (chatId: string, userId: string): Promise<IRating | null> => {
  return await RatingModel.findOne({ chat: chatId, fromUser: userId }).lean();
};

export const valorarChat = async (
  chatId: string,
  fromUserId: string,
  score: number,
  comment?: string
): Promise<IRating> => {
  if (score < 1 || score > 5) {
    throw new ValidationError('La valoracion debe estar entre 1 y 5');
  }

  const chat = await ChatModel.findById(chatId).select('owner interested closedAt isReadOnly').lean<IChat>();
  if (!chat) throw new NotFoundError('Chat no encontrado');

  const isOwner = String(chat.owner) === fromUserId;
  const isInterested = String(chat.interested) === fromUserId;
  if (!isOwner && !isInterested) throw new ForbiddenError('No autorizado');

  if (!chat.closedAt && !chat.isReadOnly) {
    throw new ValidationError('Solo puedes valorar cuando la venta esta cerrada');
  }

  const toUser = isOwner ? chat.interested : chat.owner;
  const ratedRole: RatingRole = isOwner ? 'INTERESTED' : 'OWNER';

  return await RatingModel.findOneAndUpdate(
    { chat: chatId, fromUser: fromUserId },
    {
      $set: {
        chat: new Types.ObjectId(chatId),
        fromUser: new Types.ObjectId(fromUserId),
        toUser,
        ratedRole,
        score,
        comment
      }
    },
    { upsert: true, new: true, runValidators: true }
  ).lean<IRating>();
};
