import { z } from 'zod';
import { employeeRanges, revenueRanges } from '../models/ofertaModel.js';

const objectIdRegex = /^[a-fA-F0-9]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, 'El id debe tener formato ObjectId valido');

const ofertaBaseSchema = z.object({
  region: z.string().trim().min(1, 'La region es obligatoria'),
  sector: z.string().trim().min(1, 'El sector es obligatorio'),
  revenueRange: z.enum(revenueRanges).optional(),
  businessAgeYears: z.number().min(0, 'businessAgeYears no puede ser negativo').optional(),
  employeeRange: z.enum(employeeRanges).optional(),
  companyDescription: z.string().trim().min(1, 'La descripcion es obligatoria').max(3000)
});

export const ofertaIdParamsSchema = z.object({
  id: objectIdSchema
});

export const createOfertaSchema = ofertaBaseSchema.strict();

export const updateOfertaSchema = ofertaBaseSchema
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar'
  });

export type OfertaIdParams = z.infer<typeof ofertaIdParamsSchema>;
export type CreateOfertaBody = z.infer<typeof createOfertaSchema>;
export type UpdateOfertaBody = z.infer<typeof updateOfertaSchema>;
