import mongoose from 'mongoose';
import { UsuarioModel, IUsuario } from './models/usuarioModel.js';
import { OfertaModel, IOferta } from './models/ofertaModel.js';
import { SolicitudModel } from './models/solicitudModel.js';
import { config, logger } from './config.js';

export async function setupDatabase(): Promise<void> {
  try {
    if (!config.mongoUri) {
      throw new Error('Missing required env var: MONGO_URI');
    }
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

    logger.info('Seeding final data for Relevo Demo...');

    const commonPass = '123456';

    const usersData: IUsuario[] = [
      {
        roles: ['ADMIN'],
        fullName: 'Admin Relevo',
        email: 'admin@gmail.com',
        password: commonPass,
        location: 'Barcelona',
        bio: 'Platform administrator. Responsible for system maintenance and user support.',
        professionalBackground: 'Expert in cloud infrastructure and database management.',
        preferredRegions: ['Catalunya', 'Madrid', 'Europe']
      },
      {
        roles: ['OWNER', 'INTERESTED'],
        fullName: 'Paula Tolosa',
        email: 'paula@gmail.com',
        password: commonPass,
        location: 'Mataró',
        bio: 'Propietària de negocis en el sector de la restauració. Busco algú que vulgui continuar el llegat de la meva empresa familiar.',
        professionalBackground: 'Més de 15 anys gestionant grups de restauració i càtering.',
        preferredRegions: ['Maresme', 'Barcelona']
      },
      {
        roles: ['OWNER', 'INTERESTED'],
        fullName: 'Pablo Casado',
        email: 'pabloc@gmail.com',
        password: commonPass,
        location: 'Madrid',
        bio: 'Emprendedor interesado en adquirir empresas del sector logístico o industrial en expansión.',
        professionalBackground: 'Experto en optimización de procesos y cadena de suministro.',
        preferredRegions: ['Comunidad de Madrid', 'Zaragoza']
      },
      {
        roles: ['OWNER', 'INTERESTED'],
        fullName: 'Pablo Santamaría',
        email: 'pablos@gmail.com',
        password: commonPass,
        location: 'Sant Cugat',
        bio: 'Founder of a tech startup looking for a strategic exit to focus on new ventures.',
        professionalBackground: 'Serial entrepreneur with background in AI and Fintech.',
        preferredRegions: ['London', 'Barcelona', 'Berlin']
      },
      {
        roles: ['OWNER', 'INTERESTED'],
        fullName: 'Andrea Zapata',
        email: 'andrea@gmail.com',
        password: commonPass,
        location: 'Tarragona',
        bio: 'M’interessa el sector del turisme sostenible. Busco projectes petits amb encant a prop de la costa.',
        professionalBackground: 'Guia turística i gestora de patrimoni cultural.',
        preferredRegions: ['Costa Daurada', 'Terres de l’Ebre']
      },
      {
        roles: ['OWNER', 'INTERESTED'],
        fullName: 'Pol Puig',
        email: 'pol@gmail.com',
        password: commonPass,
        location: 'Sabadell',
        bio: 'Gestor de fincas con cartera propia. Interesado en diversificar mis inversiones en el sector de servicios.',
        professionalBackground: 'Derecho y gestión inmobiliaria.',
        preferredRegions: ['Valles Occidental', 'Barcelona']
      }
    ];

    const createdUsers = await UsuarioModel.create(usersData);
    logger.info('Database ready: %d users created.', createdUsers.length);

    // Busquem els usuaris creats per obtenir els seus IDs
    const paula = createdUsers.find((u) => u.fullName === 'Paula Tolosa');
    const pabloS = createdUsers.find((u) => u.fullName === 'Pablo Santamaría');
    const pol = createdUsers.find((u) => u.fullName === 'Pol Puig');

    // Ens assegurem que els hem trobat per evitar errors de TypeScript
    if (!paula || !pabloS || !pol) {
      throw new Error('Critical: Seed users not found after creation.');
    }

    const ofertasData: IOferta[] = [
      {
        region: 'Barcelona',
        sector: 'Hospitality',
        revenueRange: 'BETWEEN_500K_1M',
        owner: paula._id as mongoose.Types.ObjectId,
        creationYear: 2010,
        employeeRange: '11_25',
        companyDescription: 'Restaurante emblemático en el centro de Barcelona con licencia C3.',
        extendedDescription:
          'Local totalmente reformado hace 2 años. Facturación estable y demostrable. Clientela local e internacional consolidada. El precio incluye todo el mobiliario y maquinaria.'
      },
      {
        region: 'International',
        sector: 'Technology',
        revenueRange: 'OVER_5M',
        owner: pabloS._id as mongoose.Types.ObjectId,
        creationYear: 2018,
        employeeRange: '51_100',
        companyDescription: 'High-growth B2B SaaS platform for automated accounting.',
        extendedDescription:
          'The company has a global presence with over 200 active enterprise clients. Profitable since year 2. Fully remote team with streamlined operations. Seeking acquisition for global scaling.'
      },
      {
        region: 'Girona',
        sector: 'Retail',
        revenueRange: 'BETWEEN_100K_500K',
        owner: paula._id as mongoose.Types.ObjectId,
        creationYear: 2015,
        employeeRange: '1_5',
        companyDescription: 'Botiga de productes gourmet i vins de proximitat al centre de Girona.',
        extendedDescription:
          'Negoci amb molt d’encant i acords exclusius amb productors locals de la zona de l’Empordà. Inclou espai de degustació i clientela fixa de més de 10 anys.'
      },
      {
        region: 'Vallès Occidental',
        sector: 'Services',
        revenueRange: 'BETWEEN_1M_5M',
        owner: pol._id as mongoose.Types.ObjectId,
        creationYear: 2005,
        employeeRange: '26_50',
        companyDescription: 'Agencia de limpieza técnica y mantenimiento industrial.',
        extendedDescription:
          'Cartera de más de 100 comunidades y 10 plantas industriales en activo. Personal formado y estable. Certificaciones de calidad ISO vigentes y maquinaria propia de última generación.'
      }
    ];

    await OfertaModel.insertMany(ofertasData);
    logger.info('Database ready: %d professional offers created.', ofertasData.length);
  } catch (err) {
    logger.error(err, 'Seeding failed');
    throw err;
  }
}
