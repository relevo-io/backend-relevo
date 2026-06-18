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
  message: z.string().max(1000).optional(),
  bio: z.string().min(10, 'La biografía debe tener al menos 10 caracteres'),
  professionalBackground: z.string().min(10, 'La trayectoria profesional debe tener al menos 10 caracteres'),
  preferredRegions: z.array(z.string().trim()),
  availableCapital: z
    .number({ message: 'El capital disponible es requerido' })
    .min(0, 'El capital disponible no puede ser negativo'),
  financingNeeded: z.boolean({ message: 'Debes indicar si necesitas financiación' }),
  ndaAccepted: z.boolean({ message: 'Debes aceptar el acuerdo de confidencialidad' }).refine((v) => v === true, {
    message: 'Debes aceptar el acuerdo de confidencialidad'
  })
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

export const guardarCvSchema = z
  .object({
    cvKey: z.string().min(1, 'El cvKey es requerido')
  })
  .strict();

export type SolicitudIdParams = z.infer<typeof solicitudIdParamsSchema>;
export type CreateSolicitudBody = z.infer<typeof createSolicitudSchema>;
export type UpdateSolicitudBody = z.infer<typeof updateSolicitudSchema>;
export type UpdateSolicitudStatusBody = z.infer<typeof updateSolicitudStatusSchema>;
export type GuardarCvBody = z.infer<typeof guardarCvSchema>;
