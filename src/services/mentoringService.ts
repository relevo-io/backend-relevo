import { Types } from 'mongoose';
import { MentoringModuleModel, ILocalizedText } from '../models/mentoringModuleModel.js';
import { IMentoringProgress, MentoringProgressModel } from '../models/mentoringProgressModel.js';

export interface IFlatMentoringItem {
  type: 'tip' | 'question' | 'task';
  title: string;
  text: string;
  options?: string[];
}

export interface IFlatMentoringModule {
  _id?: Types.ObjectId;
  title: string;
  description: string;
  items: IFlatMentoringItem[];
  order: number;
  duration: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const localizeText = (textObj: ILocalizedText | undefined, lang: string): string => {
  if (!textObj) return '';
  const key = lang as keyof ILocalizedText;
  return textObj[key] || textObj['es'] || textObj['en'] || '';
};

export const listarModulosActivos = async (lang: string): Promise<IFlatMentoringModule[]> => {
  const modules = await MentoringModuleModel.find({ isActive: true }).sort({ order: 1 }).lean();
  return modules.map((mod) => ({
    _id: mod._id,
    title: localizeText(mod.title, lang),
    description: localizeText(mod.description, lang),
    items: (mod.items || []).map((item) => ({
      type: item.type,
      title: localizeText(item.title, lang),
      text: localizeText(item.text, lang),
      options: (item.options || []).map((opt) => localizeText(opt, lang))
    })),
    order: mod.order,
    duration: mod.duration,
    isActive: mod.isActive,
    createdAt: mod.createdAt,
    updatedAt: mod.updatedAt
  }));
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
