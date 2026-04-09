import mongoose from 'mongoose';
import { UsuarioModel, IUsuario } from './models/usuarioModel.js';
import { OfertaModel, IOferta } from './models/ofertaModel.js';
import { SolicitudModel, ISolicitud } from './models/solicitudModel.js';
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
        await UsuarioModel.deleteMany({});
        await OfertaModel.deleteMany({});
        await SolicitudModel.deleteMany({});

        logger.info('Seeding initial data...');

        const usersData: IUsuario[] = [
            {
                roles: ['OWNER'],
                fullName: 'Marc Sanchez',
                email: 'm@test.com',
                password: 'secret123',
                location: 'Spain',
                bio: 'Owner profile',
                professionalBackground: '10 years in operations',
                preferredRegions: ['Madrid', 'Barcelona']
            },
            {
                roles: ['INTERESTED'],
                fullName: 'Anna Lopez',
                email: 'a@test.com',
                password: 'secret123',
                location: 'Spain',
                bio: 'Interested in acquisition opportunities',
                professionalBackground: 'Finance background',
                preferredRegions: ['Valencia']
            },
            {
                roles: ['INTERESTED', 'OWNER'],
                fullName: 'John Miller',
                email: 'j@test.com',
                password: 'secret123',
                location: 'USA',
                bio: 'Looking for international opportunities',
                professionalBackground: 'Entrepreneur and operator',
                preferredRegions: ['California', 'Texas']
            }
        ];

        const createdUsers = await UsuarioModel.insertMany(usersData);
        logger.info('Database ready: %d users created.', createdUsers.length);

        const ofertasData: IOferta[] = [
            {
                region: 'Catalonia',
                sector: 'Technology',
                revenueRange: 'BETWEEN_100K_500K',
                owner: createdUsers[0]._id,
                businessAgeYears: 5,
                employeeRange: '11_25',
                companyDescription: 'Growing SaaS startup'
            },
            {
                region: 'Madrid',
                sector: 'Hospitality',
                revenueRange: 'UNDER_100K',
                owner: createdUsers[1]._id,
                businessAgeYears: 2,
                employeeRange: '1_5',
                companyDescription: 'Local restaurant with expansion potential'
            }
        ];

        const createdOfertas = await OfertaModel.insertMany(ofertasData);
        logger.info('Database ready: %d offers created.', createdOfertas.length);

        const solicitudesData: ISolicitud[] = [
            {
                owner: createdUsers[0]._id,
                interestedUser: createdUsers[1]._id,
                opportunity: createdOfertas[0]._id,
                status: 'PENDING',
                message: 'I am interested in your company. Could we talk?'
            },
            {
                owner: createdUsers[1]._id,
                interestedUser: createdUsers[0]._id,
                opportunity: createdOfertas[1]._id,
                status: 'ACCEPTED',
                message: 'I am interested in your company. Could we talk?'
            }
        ];

        const createdSolicitudes = await SolicitudModel.insertMany(solicitudesData);
        logger.info('Database ready: %d requests created.', createdSolicitudes.length);

    } catch (err) {
        logger.error(err, 'Seeding failed');
        throw err;
    }
}
