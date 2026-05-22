import { z } from 'zod';

export const presignedUrlQuerySchema = z.object({
  filename: z.string().trim().min(1, 'El parámetro "filename" es requerido')
});

export type PresignedUrlQuery = z.infer<typeof presignedUrlQuerySchema>;
