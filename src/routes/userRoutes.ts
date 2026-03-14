import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { validate } from '../middlewares/validatorMiddleware.js';
import { userBodySchema } from '../models/userModel.js';

const router = Router();


// GET all users
router.get('/', userController.getAllUsers);

// GET analytics stats (must be before /:id)
router.get('/stats', userController.getUserStats);

// GET a specific user by ID
router.get('/:id', userController.getUser);

// POST create a new user
// We apply the validation middleware specific for users before the controller logic
router.post('/', validate(userBodySchema), userController.createNewUser);

// PUT update an existing user
// We apply the validation middleware specific
// partially, allowing updates to only some fields (partial schema)
router.put('/:id', validate(userBodySchema.partial()), userController.updateExistingUser);

// DELETE a user
router.delete('/:id', userController.removeUser);

export default router;