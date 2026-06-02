import { z } from 'zod';
import { authProviders, userRoles } from '../models/usuarioModel.js';

const objectIdRegex = /^[a-fA-F0-9]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, 'El id debe tener formato ObjectId valido');

const rolesSchema = z
  .array(z.enum(userRoles, { message: 'Rol invalido' }))
  .min(1, 'Debes enviar al menos un rol')
  .max(2, 'Maximo dos roles por usuario')
  .refine((roles) => new Set(roles).size === roles.length, {
    message: 'No se permiten roles duplicados'
  });

const preferredRegionsSchema = z.preprocess((value) => {
  if (value === undefined || value === null) return undefined;

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }

  return value;
}, z.array(z.string().trim()).optional());

const usuarioBaseSchema = z.object({
  roles: rolesSchema,
  fullName: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(120),
  email: z.string().trim().email('Email invalido'),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres').nullable().optional(),
  authProvider: z.enum(authProviders).default('local'),
  providerId: z.string().trim().min(1).nullable().optional(),
  location: z.string().trim().max(120).optional(),
  bio: z.string().max(500).optional(),
  professionalBackground: z.string().max(2000).optional(),
  cv: z.string().trim().max(4000).optional(),
  preferredRegions: preferredRegionsSchema,
  visible: z.boolean().optional(),
  language: z.enum(['es', 'ca', 'en']).optional(),
  theme: z.enum(['light', 'dark']).optional()
});

const withConditionalPassword = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((data: z.infer<T>, ctx) => {
    const typedData = data as { authProvider?: 'local' | 'google' | 'github'; password?: string | null };
    const provider = typedData.authProvider ?? 'local';
    const password = typedData.password;

    if (provider === 'local' && (!password || password.length < 6)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'Password obligatorio para cuentas locales'
      });
    }
  });

export const createUsuarioSchema = withConditionalPassword(usuarioBaseSchema.strict());

const publicRolesSchema = z
  .array(z.enum(['OWNER', 'INTERESTED']))
  .min(1, 'Debes enviar al menos un rol')
  .max(2, 'Maximo dos roles por usuario')
  .refine((roles) => new Set(roles).size === roles.length, {
    message: 'No se permiten roles duplicados'
  });

export const createUsuarioPublicSchema = withConditionalPassword(
  usuarioBaseSchema.extend({ roles: publicRolesSchema }).strict()
);

export const updateUsuarioSchema = usuarioBaseSchema
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar'
  });

export const updateUsuarioSelfSchema = usuarioBaseSchema
  .omit({ roles: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar'
  });

export const deleteManyUsuariosSchema = z.object({
  ids: z.array(objectIdSchema).min(1, 'Debes enviar al menos un id')
});

export const usuarioIdParamsSchema = z.object({
  id: objectIdSchema
});

export const updateUsuarioVisibilitySchema = z.object({
  visible: z.boolean()
});

export const updateManyUsuariosVisibilitySchema = z.object({
  ids: z.array(objectIdSchema).min(1, 'Debes enviar al menos un id'),
  visible: z.boolean()
});

export const fcmTokenSchema = z.object({
  token: z.string().min(10, 'El token debe tener al menos 10 caracteres')
});

export type CreateUsuarioBody = z.infer<typeof createUsuarioSchema>;
export type UpdateUsuarioBody = z.infer<typeof updateUsuarioSchema>;
export type DeleteManyUsuariosBody = z.infer<typeof deleteManyUsuariosSchema>;
export type UsuarioIdParams = z.infer<typeof usuarioIdParamsSchema>;
export type UpdateUsuarioVisibilityBody = z.infer<typeof updateUsuarioVisibilitySchema>;
export type UpdateManyUsuariosVisibilityBody = z.infer<typeof updateManyUsuariosVisibilitySchema>;
