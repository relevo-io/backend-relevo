import mongoose from 'mongoose';
import { UsuarioModel, IUsuario } from './models/usuarioModel.js';
import { OfertaModel, IOferta } from './models/ofertaModel.js';
import { SolicitudModel } from './models/solicitudModel.js';
import { MentoringModuleModel, IMentoringModule } from './models/mentoringModuleModel.js';
import { MentoringProgressModel } from './models/mentoringProgressModel.js';
import { config, logger } from './config.js';

export async function setupDatabase(): Promise<void> {
  try {
    if (!config.mongoUri) {
      throw new Error('Missing required env var: MONGO_URI');
    }
    mongoose.set('strictQuery', true);
    await mongoose.connect(config.mongoUri);
    try {
      const indexes = await UsuarioModel.collection.indexes();
      const providerIndex = indexes.find((index) => index.name === 'authProvider_1_providerId_1');
      const partialFilter = providerIndex?.partialFilterExpression as
        | { providerId?: { $exists?: boolean; $type?: string } }
        | undefined;

      if (partialFilter?.providerId?.$exists === true) {
        await UsuarioModel.collection.dropIndex('authProvider_1_providerId_1');
        logger.info('Dropped outdated usuario OAuth provider index');
      }
    } catch (err) {
      const mongoError = err as { codeName?: string; code?: number };
      if (
        mongoError.codeName !== 'IndexNotFound' &&
        mongoError.code !== 27 &&
        mongoError.codeName !== 'NamespaceNotFound' &&
        mongoError.code !== 26
      ) {
        throw err;
      }
    }

    try {
      const mentoringIndexes = await MentoringModuleModel.collection.indexes();
      const orderIndex = mentoringIndexes.find((index) => index.name === 'order_1');
      if (orderIndex) {
        await MentoringModuleModel.collection.dropIndex('order_1');
        logger.info('Dropped outdated mentoring order index');
      }
    } catch (err) {
      const mongoError = err as { codeName?: string; code?: number };
      if (
        mongoError.codeName !== 'IndexNotFound' &&
        mongoError.code !== 27 &&
        mongoError.codeName !== 'NamespaceNotFound' &&
        mongoError.code !== 26
      ) {
        throw err;
      }
    }

    await UsuarioModel.syncIndexes();
    await MentoringModuleModel.syncIndexes();
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
    await MentoringModuleModel.deleteMany({});
    await MentoringProgressModel.deleteMany({});

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

    const dynamicRegions = ['Barcelona', 'Madrid', 'Valencia', 'Sevilla', 'Bilbao', 'Malaga', 'Zaragoza', 'Alicante'];
    const dynamicSectors = [
      'Technology',
      'Healthcare',
      'Hospitality',
      'Retail',
      'Manufacturing',
      'Logistics',
      'Education',
      'Services'
    ];
    const dynamicRevenues: IOferta['revenueRange'][] = [
      'UNDER_100K',
      'BETWEEN_100K_500K',
      'BETWEEN_500K_1M',
      'BETWEEN_1M_5M',
      'OVER_5M'
    ];
    const dynamicEmployees: IOferta['employeeRange'][] = ['1_5', '6_10', '11_25', '26_50', '51_100', '100_PLUS'];
    const ownersPool = createdUsers.filter((u) => u.roles.includes('OWNER'));

    const EXTRA_OFFERS_COUNT = 200;
    const generatedOffers: IOferta[] = Array.from({ length: EXTRA_OFFERS_COUNT }, (_, index) => {
      const owner = ownersPool[index % ownersPool.length]!;
      const sector = dynamicSectors[index % dynamicSectors.length]!;
      const region = dynamicRegions[index % dynamicRegions.length]!;
      const revenueRange = dynamicRevenues[index % dynamicRevenues.length];
      const employeeRange = dynamicEmployees[index % dynamicEmployees.length];
      const creationYear = 1998 + (index % 27);
      const offerNumber = index + 1;

      return {
        region,
        sector,
        revenueRange,
        owner: owner._id as mongoose.Types.ObjectId,
        creationYear,
        employeeRange,
        companyDescription: `${sector} business opportunity #${offerNumber} in ${region}.`,
        extendedDescription:
          `Seeded offer ${offerNumber} for pagination testing. ` +
          `Includes stable operations, recurring revenue, and transition support.`
      };
    });

    const allOffers = [...ofertasData, ...generatedOffers];
    await OfertaModel.insertMany(allOffers);
    logger.info(
      'Database ready: %d professional offers created (%d base + %d generated).',
      allOffers.length,
      ofertasData.length,
      generatedOffers.length
    );

    const mentoringModulesData: IMentoringModule[] = [
      // === RUTA VENEDOR (SELL) ===
      {
        route: 'SELL',
        titleKey: 'mentoring.seller.m1.title',
        descriptionKey: 'mentoring.seller.m1.description',
        order: 1,
        duration: 15,
        isActive: true,
        items: [
          {
            type: 'tip',
            titleKey: 'mentoring.seller.m1.i1.title',
            contentKey: 'sell_m1_i1'
          }
        ]
      },
      {
        route: 'SELL',
        titleKey: 'mentoring.seller.m2.title',
        descriptionKey: 'mentoring.seller.m2.description',
        order: 2,
        duration: 20,
        isActive: true,
        items: [
          {
            type: 'tip',
            titleKey: 'mentoring.seller.m2.i1.title',
            contentKey: 'sell_m2_i1'
          }
        ]
      },
      {
        route: 'SELL',
        titleKey: 'mentoring.seller.m3.title',
        descriptionKey: 'mentoring.seller.m3.description',
        order: 3,
        duration: 25,
        isActive: true,
        items: [
          {
            type: 'tip',
            titleKey: 'mentoring.seller.m3.i1.title',
            contentKey: 'sell_m3_i1'
          }
        ]
      },
      {
        route: 'SELL',
        titleKey: 'mentoring.seller.m4.title',
        descriptionKey: 'mentoring.seller.m4.description',
        order: 4,
        duration: 15,
        isActive: true,
        items: [
          {
            type: 'tip',
            titleKey: 'mentoring.seller.m4.i1.title',
            contentKey: 'sell_m4_i1'
          }
        ]
      },
      {
        route: 'SELL',
        titleKey: 'mentoring.seller.m5.title',
        descriptionKey: 'mentoring.seller.m5.description',
        order: 5,
        duration: 20,
        isActive: true,
        items: [
          {
            type: 'tip',
            titleKey: 'mentoring.seller.m5.i1.title',
            contentKey: 'sell_m5_i1'
          }
        ]
      },
      {
        route: 'SELL',
        titleKey: 'mentoring.seller.m6.title',
        descriptionKey: 'mentoring.seller.m6.description',
        order: 6,
        duration: 30,
        isActive: true,
        items: [
          {
            type: 'tip',
            titleKey: 'mentoring.seller.m6.i1.title',
            contentKey: 'sell_m6_i1'
          }
        ]
      },

      // === RUTA COMPRADOR (BUY) ===
      {
        route: 'BUY',
        titleKey: 'mentoring.buyer.m1.title',
        descriptionKey: 'mentoring.buyer.m1.description',
        order: 1,
        duration: 15,
        isActive: true,
        items: [
          {
            type: 'tip',
            titleKey: 'mentoring.buyer.m1.i1.title',
            contentKey: 'buy_m1_i1'
          }
        ]
      },
      {
        route: 'BUY',
        titleKey: 'mentoring.buyer.m2.title',
        descriptionKey: 'mentoring.buyer.m2.description',
        order: 2,
        duration: 15,
        isActive: true,
        items: [
          {
            type: 'tip',
            titleKey: 'mentoring.buyer.m2.i1.title',
            contentKey: 'buy_m2_i1'
          }
        ]
      },
      {
        route: 'BUY',
        titleKey: 'mentoring.buyer.m3.title',
        descriptionKey: 'mentoring.buyer.m3.description',
        order: 3,
        duration: 25,
        isActive: true,
        items: [
          {
            type: 'tip',
            titleKey: 'mentoring.buyer.m3.i1.title',
            contentKey: 'buy_m3_i1'
          }
        ]
      },
      {
        route: 'BUY',
        titleKey: 'mentoring.buyer.m4.title',
        descriptionKey: 'mentoring.buyer.m4.description',
        order: 4,
        duration: 20,
        isActive: true,
        items: [
          {
            type: 'tip',
            titleKey: 'mentoring.buyer.m4.i1.title',
            contentKey: 'buy_m4_i1'
          }
        ]
      },
      {
        route: 'BUY',
        titleKey: 'mentoring.buyer.m5.title',
        descriptionKey: 'mentoring.buyer.m5.description',
        order: 5,
        duration: 20,
        isActive: true,
        items: [
          {
            type: 'tip',
            titleKey: 'mentoring.buyer.m5.i1.title',
            contentKey: 'buy_m5_i1'
          }
        ]
      },
      {
        route: 'BUY',
        titleKey: 'mentoring.buyer.m6.title',
        descriptionKey: 'mentoring.buyer.m6.description',
        order: 6,
        duration: 30,
        isActive: true,
        items: [
          {
            type: 'tip',
            titleKey: 'mentoring.buyer.m6.i1.title',
            contentKey: 'buy_m6_i1'
          }
        ]
      },
      {
        route: 'BUY',
        titleKey: 'mentoring.buyer.m7.title',
        descriptionKey: 'mentoring.buyer.m7.description',
        order: 7,
        duration: 25,
        isActive: true,
        items: [
          {
            type: 'tip',
            titleKey: 'mentoring.buyer.m7.i1.title',
            contentKey: 'buy_m7_i1'
          }
        ]
      }
    ];

    await MentoringModuleModel.insertMany(mentoringModulesData);
    logger.info('Database ready: %d mentoring modules created.', mentoringModulesData.length);
  } catch (err) {
    logger.error(err, 'Seeding failed');
    throw err;
  }
}
