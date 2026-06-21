import { z } from 'zod';
import { employeeRanges, revenueRanges, sectors } from '../models/ofertaModel.js';

const objectIdRegex = /^[a-fA-F0-9]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, 'El id debe tener formato ObjectId valido');

const emptyToUndefined = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return undefined;
  return value;
};

const ofertaBaseSchema = z.object({
  region: z.string().trim().min(1, 'La region es obligatoria'),
  sector: z.enum(sectors, { message: 'El sector no es valido' }),
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
    excludeOwnerId: objectIdSchema.optional(),
    search: z.string().trim().min(1).max(120).optional(),
    sector: z.enum(sectors).optional(),
    region: z.string().trim().min(1).max(120).optional(),
    revenueRange: z.enum(revenueRanges).optional(),
    employeeRange: z.enum(employeeRanges).optional(),
    creationYearFrom: z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional(),
    creationYearTo: z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional()
  })
  .refine(
    (data) =>
      data.creationYearFrom === undefined ||
      data.creationYearTo === undefined ||
      data.creationYearFrom <= data.creationYearTo,
    {
      message: 'El ano de inicio no puede ser mayor que el ano de fin',
      path: ['creationYearFrom']
    }
  )
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
