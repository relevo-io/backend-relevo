import { Request, Response } from 'express';
import * as orgService from '../services/organizationService.js';
import { logger } from '../config.js';
import { IOrganization } from '../models/organizationModel.js';

/**
 * ORGANIZATION CONTROLLER
 * Only handle HTTP concerns: status codes and JSON formatting.
 */

export const getAllOrgs = async (_req: Request, res: Response): Promise<void> => {
    try {
        const orgs = await orgService.listAllOrganizations();
        res.status(200).json(orgs);
    } catch (error) {
        logger.error(error, 'Error fetching organizations');
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const getOrg = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
        const org = await orgService.getOrganizationById(req.params.id);
        if (!org) {
            res.status(404).json({ message: 'Organization not found' });
            return;
        }
        res.status(200).json(org);
    } catch (error) {
        logger.error(error, 'Error fetching organization %s', req.params.id);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const createNewOrg = async (req: Request<{}, {}, Partial<IOrganization>>, res: Response): Promise<void> => {
    try {
        const newOrg = await orgService.createOrganization(req.body);
        res.status(201).json(newOrg);
    } catch (error) {
        logger.error(error, 'Error creating organization');
        res.status(400).json({ message: 'Invalid organization data' });
    }
};

export const updateOrg = async (req: Request<{ id: string }, {}, Partial<IOrganization>>, res: Response): Promise<void> => {
    try {
        const updated = await orgService.updateOrganization(req.params.id, req.body);
        if (!updated) {
            res.status(404).json({ message: 'Organization not found' });
            return;
        }
        res.status(200).json(updated);
    } catch (error) {
        logger.error(error, 'Error updating organization %s', req.params.id);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const removeOrg = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
        await orgService.deleteOrganization(req.params.id);
        res.status(204).send();
    } catch (error) {
        logger.error(error, 'Error deleting organization %s', req.params.id);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};