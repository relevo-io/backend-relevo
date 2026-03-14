import { Router } from 'express';
import * as orgController from '../controllers/organizationController.js';

const router = Router();

// GET all organizations
router.get('/', orgController.getAllOrgs);

// GET a specific organization
router.get('/:id', orgController.getOrg);

// GET a specific organization 'users' populated
// Note: Since getOrg already populates users, we can reuse it
router.get('/:id/users', orgController.getOrg);

// POST create a new organization
router.post('/', orgController.createNewOrg);

// PUT update an organization
router.put('/:id', orgController.updateOrg);

// DELETE an organization
router.delete('/:id', orgController.removeOrg);

export default router;