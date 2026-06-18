import { z } from 'zod';
import { employeeRanges, revenueRanges } from '../models/ofertaModel.js';

const objectIdRegex = /^[a-fA-F0-9]{24}$/;

const emptyToUndefined = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return undefined;
  return value;
};

export const alertaIdParamsSchema = z.object({
  alertaId: z.string().regex(objectIdRegex, 'El id debe tener formato ObjectId valido')
});

export const createAlertaSchema = z
  .object({
    name: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(80).optional()),
    revenueRange: z.preprocess(emptyToUndefined, z.enum(revenueRanges).optional()),
    employeeRange: z.preprocess(emptyToUndefined, z.enum(employeeRanges).optional()),
    region: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(120).optional())
  })
  .strict()
  .refine((data) => Boolean(data.revenueRange || data.employeeRange || data.region), {
    message: 'Debes indicar al menos un criterio de alerta'
  });

export type CreateAlertaBody = z.infer<typeof createAlertaSchema>;
