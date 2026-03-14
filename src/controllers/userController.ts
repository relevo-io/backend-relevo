import { Request, Response } from 'express';
import * as userService from '../services/userService.js';
import { logger } from '../config.js';
import { IUsuario } from '../models/Usuario.js';

/**
 * USER CONTROLLER
 */

export const getAllUsers = async (_req: Request, res: Response): Promise<void> => {
    try {
        const users = await userService.listAllUsers();
        res.status(200).json(users);
    } catch (error) {
        logger.error(error, 'Error fetching users');
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const getUser = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
        const user = await userService.getUserById(req.params.id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.status(200).json(user);
    } catch (error) {
        logger.error(error, 'Error fetching user %s', req.params.id);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const createNewUser = async (req: Request<{}, {}, Partial<IUsuario>>, res: Response): Promise<void> => {
    try {
        const newUser = await userService.createUser(req.body);
        res.status(201).json(newUser);
    } catch (error) {
        logger.error(error, 'Error creating user');
        res.status(400).json({ message: 'Invalid user data' });
    }
};

export const updateExistingUser = async (req: Request<{ id: string }, {}, Partial<IUsuario>>, res: Response): Promise<void> => {
    try {
        const updated = await userService.updateUser(req.params.id, req.body);
        if (!updated) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.status(200).json(updated);
    } catch (error) {
        logger.error(error, 'Error updating user %s', req.params.id);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const removeUser = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
        await userService.deleteUser(req.params.id);
        res.status(204).send();
    } catch (error) {
        logger.error(error, 'Error deleting user %s', req.params.id);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const getUserStats = async (_req: Request, res: Response): Promise<void> => {
    try {
        const stats = await userService.getStatsByCountry();
        res.status(200).json(stats);
    } catch (error) {
        logger.error(error, 'Error fetching user stats');
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
