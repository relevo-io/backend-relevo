import { Router } from 'express';
import * as userController from '../controllers/userController.js';

const router = Router();


// GET all users
router.get('/', userController.getAllUsers);

// GET analytics stats (must be before /:id)
router.get('/stats', userController.getUserStats);

// GET a specific user by ID
router.get('/:id', userController.getUser);

// POST create a new user
router.post('/', userController.createNewUser);

// PUT update an existing user
router.put('/:id', userController.updateExistingUser);

// DELETE a user
router.delete('/:id', userController.removeUser);

export default router;
