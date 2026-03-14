import mongoose from 'mongoose';
import { Usuario, IUsuario } from './models/Usuario.js';
import { config, logger } from './config.js';

export async function setupDatabase(): Promise<void> {
    try {
        mongoose.set('strictQuery', true);
        await mongoose.connect(config.mongoUri);
        logger.info('Connected to MongoDB');
    } catch (err) {
        logger.error(err, 'Database connection failed');
        throw err;
    }
}

export async function seedingDatabase(): Promise<void> {
    try {
        logger.warn('Cleaning database collections...');
        await Usuario.deleteMany({});

        logger.info('Seeding initial data...');

        const usersData: IUsuario[] = [
            {
                role: 'OWNER',
                fullName: 'Marc Sanchez',
                email: 'm@test.com',
                password: 'secret123',
                location: 'Spain',
                bio: 'Owner profile',
                professionalBackground: '10 years in operations',
                preferredRegions: ['Madrid', 'Barcelona']
            },
            {
                role: 'INTERESTED',
                fullName: 'Anna Lopez',
                email: 'a@test.com',
                password: 'secret123',
                location: 'Spain',
                bio: 'Interested in acquisition opportunities',
                professionalBackground: 'Finance background',
                preferredRegions: ['Valencia']
            },
            {
                role: 'INTERESTED',
                fullName: 'John Miller',
                email: 'j@test.com',
                password: 'secret123',
                location: 'USA',
                bio: 'Looking for international opportunities',
                professionalBackground: 'Entrepreneur and operator',
                preferredRegions: ['California', 'Texas']
            }
        ];

        const createdUsers = await Usuario.insertMany(usersData);
        logger.info('Database ready: %d users created.', createdUsers.length);
    } catch (err) {
        logger.error(err, 'Seeding failed');
        throw err;
    }
}
