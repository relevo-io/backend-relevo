import { UserModel, IUser } from '../models/userModel.js';
import { OrganizationModel } from '../models/organizationModel.js';

/**
 * USER SERVICE: Pure-logic wrappers for Database operations.
 * Implements functional principles by returning plain objects (Lean).
 */

// CREATE: Returns the newly created user
export const createUser = async (userData: Partial<IUser>): Promise<IUser> => {
    // 1. Save the new user
    const newUser = await new UserModel(userData).save();

    // 2. Manual Synchronization
    // Push the new User ID into 'users' array in Organization
    if (newUser.organization) {
        await OrganizationModel.findByIdAndUpdate(
            newUser.organization,
            { $push: { users: newUser._id } } // Add user ID to the organization's vector
        );
    }
    return newUser;
};

// READ: Returns a populated user or null
export const getUserById = async (id: string): Promise<IUser | null> => {
    return await UserModel.findById(id).populate('organization').lean();
};

// UPDATE: Returns the updated version of the document
export const updateUser = async (userId: string, data: Partial<IUser>): Promise<IUser | null> => {
    // Find the current state of the user to check if the organization changed
    const oldUser = await UserModel.findById(userId);
    const updatedUser = await UserModel.findByIdAndUpdate(userId, data, { new: true });

    if (!updatedUser) return null;

    // Logic to handle organization change
    // If the organization ID is different, we must remove the user from the old one and add to the new one.
    if (oldUser && oldUser.organization.toString() !== updatedUser.organization.toString()) {
        
        // Remove from old organization
        await OrganizationModel.findByIdAndUpdate(oldUser.organization, { $pull: { users: userId } });

        // Add to new organization
        await OrganizationModel.findByIdAndUpdate(updatedUser.organization, { $push: { users: userId } });
    }

    return updatedUser;
};

// DELETE: Returns the deleted document
export const deleteUser = async (id: string): Promise<IUser | null> => {
    return await UserModel.findByIdAndDelete(id).lean();
};

// LIST: Returns an array of users
export const listAllUsers = async (): Promise<IUser[]> => {
    return await UserModel.find().lean();
};

// AGGREGATION: Declarative data transformation
export const getStatsByCountry = async (): Promise<any[]> => {
    return await UserModel.aggregate([
        {
            $lookup: {
                from: 'organizations',
                localField: 'organization',
                foreignField: '_id',
                as: 'orgData'
            }
        },
        { $unwind: '$orgData' },
        {
            $group: {
                _id: '$orgData.country',
                totalUsers: { $sum: 1 },
                userNames: { $push: '$name' }
            }
        },
        { $project: { country: '$_id', totalUsers: 1, userNames: 1, _id: 0 } }
    ]);
};