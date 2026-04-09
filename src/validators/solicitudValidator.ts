import { z } from 'zod';
import { accessRequestStatuses } from '../models/solicitudModel.js';

const objectIdRegex = /^[a-fA-F0-9]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, 'El id debe tener formato ObjectId valido');

const statusSchema = z.enum(accessRequestStatuses);

export const solicitudIdParamsSchema = z.object({
  id: objectIdSchema
});

export const createSolicitudSchema = z.object({
  opportunityId: z.string().length(24, 'ID de oferta invalido'),
  message: z.string().max(1000).optional()
});

export const updateSolicitudSchema = z
  .object({
    message: z.string().max(1000).optional()
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar'
  });

export const updateSolicitudStatusSchema = z
  .object({
    status: statusSchema
  })
  .strict();

export type SolicitudIdParams = z.infer<typeof solicitudIdParamsSchema>;
export type CreateSolicitudBody = z.infer<typeof createSolicitudSchema>;
export type UpdateSolicitudBody = z.infer<typeof updateSolicitudSchema>;
export type UpdateSolicitudStatusBody = z.infer<typeof updateSolicitudStatusSchema>;
