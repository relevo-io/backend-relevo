import { Router } from 'express';
import * as assistantController from '../controllers/assistantController.js';
import { validate } from '../middlewares/validatorMiddleware.js';
import { assistantChatSchema } from '../validators/assistantValidator.js';
import { authenticateToken, authorizeRoles, optionalAuthenticateToken } from '../middlewares/auth.js';

const router = Router();

router.post('/chat', optionalAuthenticateToken, validate({ body: assistantChatSchema }), assistantController.chat);

router.post('/reindex', authenticateToken, authorizeRoles('ADMIN'), assistantController.reindex);

export default router;
