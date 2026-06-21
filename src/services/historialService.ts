import HistorialModel from '../models/historialModel.js';

export const historialService = {
  // Obtenir tots els historials amb paginació i cerca
  getAll: async (page: number = 1, limit: number = 10, search?: string) => {
    const query: { [key: string]: unknown } = {};

    // Si ens passen un terme de cerca, busquem a l'ID de l'oferta
    // (com és un ObjectId, la cerca ha de ser exacta, o pots buscar dins de l'array de canvis)
    if (search) {
      query['canvis.campo'] = { $regex: search, $options: 'i' };
    }

    const skip = (page - 1) * limit;

    const total = await HistorialModel.countDocuments(query);
    const historials = await HistorialModel.find(query)
      .populate('ofertaId', 'sector region') // per portar info de l'oferta relacionada
      .sort({ fecha: -1 }) // Ordenem dels més nous als més antics
      .skip(skip)
      .limit(limit);

    return {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: historials
    };
  },

  getById: async (id: string) => {
    return await HistorialModel.findById(id).populate('ofertaId');
  },

  delete: async (id: string) => {
    return await HistorialModel.findByIdAndDelete(id);
  }
};
