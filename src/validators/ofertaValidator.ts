import { z } from 'zod';
import { employeeRanges, revenueRanges } from '../models/ofertaModel.js';

const objectIdRegex = /^[a-fA-F0-9]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, 'El id debe tener formato ObjectId valido');

const emptyToUndefined = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return undefined;
  return value;
};

const ofertaBaseSchema = z.object({
  region: z.string().trim().min(1, 'La region es obligatoria'),
  sector: z.string().trim().min(1, 'El sector es obligatorio'),
  revenueRange: z.preprocess(emptyToUndefined, z.enum(revenueRanges).optional()),
  creationYear: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .min(1800, 'El ano de creacion no es valido')
      .max(new Date().getFullYear(), 'El ano no puede estar en el futuro')
      .optional()
  ),
  employeeRange: z.preprocess(emptyToUndefined, z.enum(employeeRanges).optional()),
  companyDescription: z.string().trim().min(1, 'La descripcion es obligatoria').max(3000),
  extendedDescription: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(1, 'La descripcion extendida es obligatoria').max(10000).optional()
  ),
  owner: objectIdSchema.optional()
});

export const ofertaIdParamsSchema = z.object({
  id: objectIdSchema
});

export const ofertaQuerySchema = z
  .object({
    excludeOwnerId: objectIdSchema.optional()
  })
  .strict();

export const createOfertaSchema = ofertaBaseSchema.strict();

export const updateOfertaSchema = ofertaBaseSchema
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar'
  });

export type OfertaIdParams = z.infer<typeof ofertaIdParamsSchema>;
export type OfertaQuery = z.infer<typeof ofertaQuerySchema>;
export type CreateOfertaBody = z.infer<typeof createOfertaSchema>;
export type UpdateOfertaBody = z.infer<typeof updateOfertaSchema>;
