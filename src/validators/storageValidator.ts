import { z } from 'zod';

export const presignedUrlQuerySchema = z.object({
  filename: z.string().trim().min(1, 'El parámetro "filename" es requerido')
});

export const chatPresignedUrlQuerySchema = z.object({
  filename: z.string().trim().min(1, 'El parámetro "filename" es requerido'),
  mimeType: z.string().trim().min(1, 'El parámetro "mimeType" es requerido')
});

export type PresignedUrlQuery = z.infer<typeof presignedUrlQuerySchema>;
export type ChatPresignedUrlQuery = z.infer<typeof chatPresignedUrlQuerySchema>;
