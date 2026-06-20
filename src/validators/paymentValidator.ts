import { z } from 'zod';
import { createOfertaSchema } from './ofertaValidator.js';

const objectIdRegex = /^[a-fA-F0-9]{24}$/;

export const createCheckoutSessionSchema = z
  .object({
    kind: z.enum(['offer_publication', 'pro_activation']),
    offerDraft: createOfertaSchema.optional(),
    returnUrlBase: z.string().url('La URL de retorno no es valida').optional()
  })
  .superRefine((data, ctx) => {
    if (data.kind === 'offer_publication' && !data.offerDraft) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['offerDraft'],
        message: 'El borrador de la oferta es obligatorio'
      });
    }

    if (data.kind === 'pro_activation' && data.offerDraft) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['offerDraft'],
        message: 'No debes enviar offerDraft para activar Pro'
      });
    }
  });

export const paymentSessionIdParamsSchema = z.object({
  paymentSessionId: z.string().regex(objectIdRegex, 'El id debe tener formato ObjectId valido')
});
