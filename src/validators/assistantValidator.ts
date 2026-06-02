import { z } from 'zod';

export const assistantChatSchema = z.object({
  message: z.string().trim().min(1, 'La pregunta es obligatoria').max(1000, 'La pregunta es demasiado larga')
});
