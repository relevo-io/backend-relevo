import { IUsuario, UsuarioModel, INotificationPreferences } from '../models/usuarioModel.js';
import { NotFoundError, ValidationError } from '../utils/AppError.js';

const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;

export const isProActive = (usuario?: Pick<IUsuario, 'proExpiresAt'> | null): boolean => {
  if (!usuario?.proExpiresAt) return false;
  return new Date(usuario.proExpiresAt).getTime() > Date.now();
};

const hydrateUsuarioAccess = <T extends IUsuario | null>(usuario: T): T => {
  if (!usuario) return usuario;

  return {
    ...usuario,
    publicationCredits: usuario.publicationCredits ?? 0,
    proExpiresAt: usuario.proExpiresAt ?? null,
    proActive: isProActive(usuario)
  } as T;
};

export const crearUsuario = async (data: Partial<IUsuario>): Promise<IUsuario> => {
  const usuario = await new UsuarioModel(data).save();
  return hydrateUsuarioAccess(usuario.toObject());
};

export const obtenerUsuarioPorId = async (id: string): Promise<IUsuario | null> => {
  return hydrateUsuarioAccess(await UsuarioModel.findById(id).select('-password').lean());
};

export const actualizarUsuario = async (id: string, data: Partial<IUsuario>): Promise<IUsuario | null> => {
  return hydrateUsuarioAccess(await UsuarioModel.findByIdAndUpdate(id, data, { returnDocument: 'after' }).lean());
};

export const eliminarUsuario = async (id: string): Promise<IUsuario | null> => {
  return await UsuarioModel.findByIdAndDelete(id).lean();
};

export const eliminarUsuariosPorIds = async (ids: string[]): Promise<number> => {
  const result = await UsuarioModel.deleteMany({ _id: { $in: ids } });
  return result.deletedCount ?? 0;
};

export const actualizarVisibilidadUsuario = async (id: string, visible: boolean): Promise<IUsuario | null> => {
  return hydrateUsuarioAccess(
    await UsuarioModel.findByIdAndUpdate(id, { visible }, { returnDocument: 'after' }).lean()
  );
};

export const actualizarVisibilidadUsuarios = async (
  ids: string[],
  visible: boolean
): Promise<{ matchedCount: number; modifiedCount: number }> => {
  const result = await UsuarioModel.updateMany({ _id: { $in: ids } }, { $set: { visible } });
  return {
    matchedCount: result.matchedCount ?? 0,
    modifiedCount: result.modifiedCount ?? 0
  };
};

export const listarUsuarios = async (): Promise<IUsuario[]> => {
  const usuarios = await UsuarioModel.find().select('-password').lean();
  return usuarios.map((usuario) => hydrateUsuarioAccess(usuario)) as IUsuario[];
};

export const registrarFcmToken = async (id: string, token: string): Promise<void> => {
  // Primero, removemos el token de cualquier otro usuario que lo tenga registrado para evitar duplicados en dispositivos compartidos
  await UsuarioModel.updateMany({ fcmTokens: token, _id: { $ne: id } }, { $pull: { fcmTokens: token } });
  await UsuarioModel.findByIdAndUpdate(id, { $addToSet: { fcmTokens: token } });
};

export const desregistrarFcmToken = async (id: string, token: string): Promise<void> => {
  await UsuarioModel.findByIdAndUpdate(id, { $pull: { fcmTokens: token } });
};

export const actualizarPreferenciasNotificacion = async (
  id: string,
  prefs: INotificationPreferences
): Promise<IUsuario | null> => {
  return hydrateUsuarioAccess(
    await UsuarioModel.findByIdAndUpdate(id, { $set: { notificationPreferences: prefs } }, { returnDocument: 'after' })
      .select('-password')
      .lean()
  );
};

export const actualizarPreferenciasMarketplace = async (
  id: string,
  data: Pick<
    IUsuario,
    | 'preferredRegions'
    | 'preferredSectors'
    | 'preferredEmployeeRanges'
    | 'preferredRevenueRanges'
    | 'preferredCreationYearFrom'
    | 'preferredCreationYearTo'
  >
): Promise<IUsuario | null> => {
  return hydrateUsuarioAccess(
    await UsuarioModel.findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after' }).select('-password').lean()
  );
};

export const otorgarCreditoPublicacion = async (id: string): Promise<IUsuario> => {
  const usuario = await UsuarioModel.findByIdAndUpdate(
    id,
    { $inc: { publicationCredits: 1 } },
    { returnDocument: 'after' }
  )
    .select('-password')
    .lean();

  if (!usuario) {
    throw new NotFoundError('Usuario no encontrado');
  }

  return hydrateUsuarioAccess(usuario) as IUsuario;
};

export const consumirCreditoPublicacion = async (id: string): Promise<void> => {
  const usuario = await UsuarioModel.findOneAndUpdate(
    { _id: id, publicationCredits: { $gt: 0 } },
    { $inc: { publicationCredits: -1 } },
    { returnDocument: 'after' }
  )
    .select('_id')
    .lean();

  if (!usuario) {
    throw new ValidationError('MONETIZATION.PUBLISH_CREDIT_REQUIRED');
  }
};

export const activarPlanPro = async (id: string): Promise<IUsuario> => {
  const baseDate = new Date();
  const usuarioActual = await UsuarioModel.findById(id).select('proExpiresAt').lean();

  if (!usuarioActual) {
    throw new NotFoundError('Usuario no encontrado');
  }

  const currentExpiry = usuarioActual.proExpiresAt ? new Date(usuarioActual.proExpiresAt) : null;
  const startAt = currentExpiry && currentExpiry.getTime() > Date.now() ? currentExpiry : baseDate;
  const nextExpiry = new Date(startAt.getTime() + THIRTY_DAYS_IN_MS);

  const usuario = await UsuarioModel.findByIdAndUpdate(
    id,
    { $set: { proExpiresAt: nextExpiry } },
    { returnDocument: 'after' }
  )
    .select('-password')
    .lean();

  if (!usuario) {
    throw new NotFoundError('Usuario no encontrado');
  }

  return hydrateUsuarioAccess(usuario) as IUsuario;
};

export const obtenerAccesoUsuario = async (
  id: string
): Promise<Pick<
  IUsuario,
  | '_id'
  | 'roles'
  | 'favoriteOfferIds'
  | 'publicationCredits'
  | 'proExpiresAt'
  | 'preferredRegions'
  | 'preferredSectors'
  | 'preferredEmployeeRanges'
  | 'preferredRevenueRanges'
  | 'preferredCreationYearFrom'
  | 'preferredCreationYearTo'
> | null> => {
  return await UsuarioModel.findById(id)
    .select(
      'roles favoriteOfferIds publicationCredits proExpiresAt preferredRegions preferredSectors preferredEmployeeRanges preferredRevenueRanges preferredCreationYearFrom preferredCreationYearTo'
    )
    .lean();
};
