import { Types } from 'mongoose';
import { MentoringModuleModel } from '../models/mentoringModuleModel.js';
import { IMentoringProgress, MentoringProgressModel } from '../models/mentoringProgressModel.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface IFlatMentoringItem {
  type: 'tip' | 'question' | 'task';
  titleKey: string;
  contentKey: string;
  optionsKeys?: string[];
}

export interface IFlatMentoringModule {
  _id?: Types.ObjectId;
  route: 'BUY' | 'SELL';
  titleKey: string;
  descriptionKey: string;
  items: IFlatMentoringItem[];
  order: number;
  duration: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export const listarModulosActivos = async (_lang?: string): Promise<IFlatMentoringModule[]> => {
  const modules = await MentoringModuleModel.find({ isActive: true }).sort({ route: 1, order: 1 }).lean();
  return modules.map((mod) => ({
    _id: mod._id,
    route: mod.route,
    titleKey: mod.titleKey,
    descriptionKey: mod.descriptionKey,
    items: (mod.items || []).map((item) => ({
      type: item.type,
      titleKey: item.titleKey,
      contentKey: item.contentKey,
      optionsKeys: item.optionsKeys
    })),
    order: mod.order,
    duration: mod.duration,
    isActive: mod.isActive,
    createdAt: mod.createdAt,
    updatedAt: mod.updatedAt
  }));
};

export const obtenerContenidoMarkdown = async (
  route: 'BUY' | 'SELL',
  contentKey: string,
  lang: string
): Promise<string> => {
  const normalizedLang = ['ca', 'es', 'en'].includes(lang) ? lang : 'es';
  const routeFolder = route === 'BUY' ? 'buyer' : 'seller';
  const filePath = path.join(__dirname, `../assets/mentoring/${routeFolder}/${contentKey}_${normalizedLang}.md`);

  try {
    return await fs.promises.readFile(filePath, 'utf8');
  } catch (_err) {
    // Si no es troba el fitxer, generem un contingut de mostra dinàmic
    const formattedTitle = contentKey.replace(/_/g, ' ').toUpperCase();
    return `# ${formattedTitle}\n\n[Contingut del pas \`${contentKey}\` en desenvolupament per a l'idioma \`${normalizedLang}\`]\n\nPròximament afegirem els continguts complets per a la ruta de ${route === 'BUY' ? 'Compra' : 'Venda'}.`;
  }
};

export const obtenerOInicializarProgreso = async (userId: string): Promise<IMentoringProgress> => {
  let progress = await MentoringProgressModel.findOne({ userId });

  if (!progress) {
    progress = await new MentoringProgressModel({
      userId: new Types.ObjectId(userId),
      completedModules: [],
      progressPercentage: 0
    }).save();
  }

  return progress;
};

export const completarModulo = async (userId: string, moduleId: string): Promise<IMentoringProgress> => {
  const modulo = await MentoringModuleModel.findOne({ _id: moduleId, isActive: true });
  if (!modulo) {
    throw new Error('El módulo de mentoring no existe o no está activo');
  }

  let progress = await MentoringProgressModel.findOne({ userId });
  if (!progress) {
    progress = new MentoringProgressModel({
      userId: new Types.ObjectId(userId),
      completedModules: [],
      progressPercentage: 0
    });
  }

  const moduloIdObj = new Types.ObjectId(moduleId);
  const jaCompletat = progress.completedModules.some((id) => id.equals(moduloIdObj));

  if (!jaCompletat) {
    progress.completedModules.push(moduloIdObj);
  }

  const totalModulosActivos = await MentoringModuleModel.countDocuments({ isActive: true });
  if (totalModulosActivos > 0) {
    progress.progressPercentage = Math.round((progress.completedModules.length / totalModulosActivos) * 100);
  } else {
    progress.progressPercentage = 100;
  }

  return await progress.save();
};
