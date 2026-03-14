import mongoose, { Types } from 'mongoose';
import { OrganizationModel, IOrganization } from './models/organizationModel.js';
import { UserModel, IUser } from './models/userModel.js';
import { config, logger } from './config.js';

export async function setupDatabase(): Promise<void> {
    try {
        mongoose.set('strictQuery', true);
        await mongoose.connect(config.mongoUri);
        logger.info('🚀 Connected to MongoDB');
    } catch (err) {
        logger.error(err, '❌ Database connection failed');
        throw err; // Re-throw so main() can handle it
    }
}

export async function seedingDatabase(): Promise<void> {
    try {
        logger.warn('🧹 Cleaning database collections...');
        await Promise.all([
            UserModel.deleteMany({}),
            OrganizationModel.deleteMany({})
        ]);

        logger.info('🌱 Seeding initial data...');

        const createdOrgs: IOrganization[] = await OrganizationModel.insertMany([
            { name: 'Tech Solutions', country: 'Spain', users: [] },
            { name: 'Global Corp', country: 'USA', users: [] }
        ]);

        const org1Id = createdOrgs[0]._id;
        const org2Id = createdOrgs[1]._id;

        const usersData: IUser[] = [
            { name: 'Marc', email: 'm@test.com', role: 'ADMIN', organization: new Types.ObjectId(org1Id?.toString()) },
            { name: 'Anna', email: 'a@test.com', role: 'USER', organization: new Types.ObjectId(org1Id?.toString()) },
            { name: 'John', email: 'j@test.com', role: 'EDITOR', organization: new Types.ObjectId(org2Id?.toString()) }
        ];

        const createdUsers = await UserModel.insertMany(usersData);
        
        // Manual Sync for Seeding
        // Manually update the Organizations here to link the newly created Users.

        // Link Marc and Anna to Tech Solutions
        await OrganizationModel.findByIdAndUpdate(org1Id, {
            $set: { users: [createdUsers[0]._id, createdUsers[1]._id] }
        });

        // Link John to Global Corp
        await OrganizationModel.findByIdAndUpdate(org2Id, {
            $set: { users: [createdUsers[2]._id] }
        });

        logger.info('✅ Database ready: %d orgs and %d users linked.', createdOrgs.length, createdUsers.length);

    } catch (err) {
        logger.error(err, '❌ Seeding failed');
        throw err;
    }
}