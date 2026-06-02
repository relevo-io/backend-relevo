import { Router } from 'express';
import * as mentoringController from '../controllers/mentoringController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

router.get('/modules', authenticateToken, mentoringController.getModules);
router.get('/progress', authenticateToken, mentoringController.getProgress);
router.post('/progress/complete/:moduleId', authenticateToken, mentoringController.completeModule);

export default router;
