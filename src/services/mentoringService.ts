import { Types } from 'mongoose';
import { MentoringModuleModel, IMentoringItem } from '../models/mentoringModuleModel.js';
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
  const filePath = path.join(
    process.cwd(),
    'src',
    'assets',
    'mentoring',
    routeFolder,
    `${contentKey}_${normalizedLang}.md`
  );

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
      completedSteps: [],
      progressPercentage: 0
    }).save();
  } else if (!progress.completedSteps) {
    progress.completedSteps = [];
    await progress.save();
  }

  return progress;
};

export const togglePasoCompletado = async (userId: string, contentKey: string): Promise<IMentoringProgress> => {
  let progress = await MentoringProgressModel.findOne({ userId });
  if (!progress) {
    progress = new MentoringProgressModel({
      userId: new Types.ObjectId(userId),
      completedModules: [],
      completedSteps: [],
      progressPercentage: 0
    });
  }

  if (!progress.completedSteps) {
    progress.completedSteps = [];
  }

  const index = progress.completedSteps.indexOf(contentKey);
  if (index >= 0) {
    progress.completedSteps.splice(index, 1);
  } else {
    progress.completedSteps.push(contentKey);
  }

  // Recalcular modulos completados y porcentaje total
  const modulosActivos = await MentoringModuleModel.find({ isActive: true });
  let totalSteps = 0;
  let completedStepsCount = 0;
  const completedModules: Types.ObjectId[] = [];

  for (const mod of modulosActivos) {
    const steps = (mod.items || []) as IMentoringItem[];
    if (steps.length === 0) continue;

    totalSteps += steps.length;

    // Check if all steps of this module are completed
    const allCompleted = steps.every((step) => progress.completedSteps.includes(step.contentKey));
    if (allCompleted) {
      completedModules.push(mod._id as Types.ObjectId);
    }

    // Count how many steps in this module are completed
    completedStepsCount += steps.filter((step) => progress.completedSteps.includes(step.contentKey)).length;
  }

  progress.completedModules = completedModules;
  progress.progressPercentage = totalSteps > 0 ? Math.round((completedStepsCount / totalSteps) * 100) : 100;

  return await progress.save();
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
      completedSteps: [],
      progressPercentage: 0
    });
  }

  const moduloIdObj = new Types.ObjectId(moduleId);
  const jaCompletat = progress.completedModules.some((id) => id.equals(moduloIdObj));

  if (!jaCompletat) {
    progress.completedModules.push(moduloIdObj);
    // Auto-complete all steps of this module
    const steps = (modulo.items || []) as IMentoringItem[];
    for (const step of steps) {
      if (!progress.completedSteps.includes(step.contentKey)) {
        progress.completedSteps.push(step.contentKey);
      }
    }
  }

  const modulosActivos = await MentoringModuleModel.find({ isActive: true });
  let totalSteps = 0;
  let completedStepsCount = 0;
  for (const mod of modulosActivos) {
    const steps = (mod.items || []) as IMentoringItem[];
    totalSteps += steps.length;
    completedStepsCount += steps.filter((step) => progress.completedSteps.includes(step.contentKey)).length;
  }

  progress.progressPercentage = totalSteps > 0 ? Math.round((completedStepsCount / totalSteps) * 100) : 100;

  return await progress.save();
};
