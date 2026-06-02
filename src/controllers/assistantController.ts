import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import * as assistantService from '../services/assistantService.js';

export const chat = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await assistantService.askAssistant(req.body.message, req.user);
  res.status(200).json(result);
});

export const reindex = asyncWrapper(async (_req: AuthRequest, res: Response): Promise<void> => {
  const result = await assistantService.reindexAssistantDocuments();
  res.status(200).json(result);
});
