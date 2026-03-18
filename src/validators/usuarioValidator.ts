import { z } from 'zod';

const objectIdRegex = /^[a-fA-F0-9]{24}$/;

export const deleteManyUsuariosSchema = z.object({
  ids: z.array(z.string().regex(objectIdRegex, 'Cada id debe tener formato ObjectId válido')).min(1, 'Debes enviar al menos un id')
});

export const updateUsuarioVisibilitySchema = z.object({
  visible: z.boolean()
});

export const updateManyUsuariosVisibilitySchema = z.object({
  ids: z.array(z.string().regex(objectIdRegex, 'Cada id debe tener formato ObjectId válido')).min(1, 'Debes enviar al menos un id'),
  visible: z.boolean()
});

export type DeleteManyUsuariosBody = z.infer<typeof deleteManyUsuariosSchema>;
export type UpdateUsuarioVisibilityBody = z.infer<typeof updateUsuarioVisibilitySchema>;
export type UpdateManyUsuariosVisibilityBody = z.infer<typeof updateManyUsuariosVisibilitySchema>;
