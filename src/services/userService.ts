import { Usuario, IUsuario } from '../models/Usuario.js';

export const createUser = async (userData: Partial<IUsuario>): Promise<IUsuario> => {
    return await new Usuario(userData).save();
};

export const getUserById = async (id: string): Promise<IUsuario | null> => {
    return await Usuario.findById(id).lean();
};

export const updateUser = async (userId: string, data: Partial<IUsuario>): Promise<IUsuario | null> => {
    return await Usuario.findByIdAndUpdate(userId, data, { new: true }).lean();
};

export const deleteUser = async (id: string): Promise<IUsuario | null> => {
    return await Usuario.findByIdAndDelete(id).lean();
};

export const listAllUsers = async (): Promise<IUsuario[]> => {
    return await Usuario.find().lean();
};

export const getStatsByCountry = async (): Promise<any[]> => {
    return await Usuario.aggregate([
        {
            $group: {
                _id: '$location',
                totalUsers: { $sum: 1 },
                userNames: { $push: '$fullName' }
            }
        },
        {
            $project: {
                country: { $ifNull: ['$_id', 'UNSPECIFIED'] },
                totalUsers: 1,
                userNames: 1,
                _id: 0
            }
        }
    ]);
};
