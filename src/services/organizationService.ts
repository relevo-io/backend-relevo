import { OrganizationModel, IOrganization } from '../models/organizationModel.js';

/**
 * ORGANIZATION SERVICE: Business logic for Organization entity.
 */

export const createOrganization = async (data: Partial<IOrganization>): Promise<IOrganization> => {
    return await new OrganizationModel(data).save();
};

export const getOrganizationById = async (id: string): Promise<IOrganization | null> => {
    return await OrganizationModel.findById(id).lean();
};

export const updateOrganization = async (id: string, data: Partial<IOrganization>): Promise<IOrganization | null> => {
    return await OrganizationModel.findByIdAndUpdate(id, data, { new: true }).lean();
};

export const deleteOrganization = async (id: string): Promise<IOrganization | null> => {
    return await OrganizationModel.findByIdAndDelete(id).lean();
};

export const listAllOrganizations = async (): Promise<IOrganization[]> => {
    return await OrganizationModel.find()
        .populate('users') // Fetch user details instead of just IDs
        .lean();           
};

export const getOrganizationWithUsers = async (id: string): Promise<IOrganization | null> => {
    return await OrganizationModel.findById(id)
        .populate('users') // Fetch user details instead of just IDs
        .lean();
};