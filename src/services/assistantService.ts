import { Types } from 'mongoose';
import { config, logger } from '../config.js';
import { IOferta, OfertaModel } from '../models/ofertaModel.js';
import { UsuarioModel } from '../models/usuarioModel.js';
import { SolicitudModel } from '../models/solicitudModel.js';
import { ChatModel } from '../models/chatModel.js';
import { IJwtPayload } from '../models/JwtPayload.js';
import { AiError } from '../utils/AppError.js';

const CLASS_NAME = 'RelevoAssistantDocument';

type AssistantMode = 'PUBLIC' | 'AUTHENTICATED';
type DocumentKind = 'PLATFORM_INFO' | 'OFFER';

export type AssistantSource = {
  kind: DocumentKind;
  sourceId: string;
  title: string;
};

export type AssistantResponse = {
  answer: string;
  mode: AssistantMode;
  sources: AssistantSource[];
};

type AssistantDocument = AssistantSource & {
  content: string;
  visibility: 'PUBLIC';
  updatedAt: string;
};

const platformDocuments: AssistantDocument[] = [
  {
    kind: 'PLATFORM_INFO',
    sourceId: 'platform-overview',
    title: 'Que es Relevo',
    content:
      'Relevo es una plataforma que conecta propietarios de pymes rentables que quieren jubilarse y vender su empresa con personas interesadas en adquirir una empresa ya existente.',
    visibility: 'PUBLIC',
    updatedAt: new Date().toISOString()
  },
  {
    kind: 'PLATFORM_INFO',
    sourceId: 'roles',
    title: 'Roles owner e interested',
    content:
      'Un owner es el propietario que publica una empresa en venta. Un interested es una persona que busca adquirir una empresa sin empezar desde cero.',
    visibility: 'PUBLIC',
    updatedAt: new Date().toISOString()
  },
  {
    kind: 'PLATFORM_INFO',
    sourceId: 'publish-offer',
    title: 'Como publicar una empresa',
    content:
      'Para publicar una empresa, el usuario debe tener rol OWNER, iniciar sesion y crear una oferta con region, sector, rangos de facturacion y empleados, y una descripcion publica.',
    visibility: 'PUBLIC',
    updatedAt: new Date().toISOString()
  },
  {
    kind: 'PLATFORM_INFO',
    sourceId: 'request-access',
    title: 'Como solicitar una oferta',
    content:
      'Un usuario interesado puede revisar ofertas del marketplace y solicitar acceso a una empresa. El owner recibe la solicitud y decide si acepta avanzar hacia el chat y conversaciones mas detalladas.',
    visibility: 'PUBLIC',
    updatedAt: new Date().toISOString()
  },
  {
    kind: 'PLATFORM_INFO',
    sourceId: 'out-of-platform',
    title: 'Que queda fuera de Relevo',
    content:
      'Relevo facilita el primer contacto y la transicion generacional, pero no gestiona reuniones presenciales, negociacion final, papeleo legal, due diligence ni firma de compraventa.',
    visibility: 'PUBLIC',
    updatedAt: new Date().toISOString()
  }
];

const jsonHeaders = { 'Content-Type': 'application/json' };

const weaviateUrl = (path: string): string => `${config.weaviate.url.replace(/\/$/, '')}${path}`;

const stableUuidFromSource = (kind: DocumentKind, sourceId: string): string => {
  const value = `${kind}:${sourceId}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `${hex}-0000-4000-8000-000000000000`;
};

const sanitizeGraphqlString = (value: string): string => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const isGreetingOnly = (message: string): boolean => {
  const normalized = message
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  const greetingPatterns = [
    'hola',
    'buenas',
    'buenos dias',
    'buen dia',
    'buenas tardes',
    'buenas noches',
    'hey',
    'hello',
    'hi'
  ];

  return greetingPatterns.includes(normalized);
};

const ensureWeaviateSchema = async (): Promise<void> => {
  const schemaResponse = await fetch(weaviateUrl(`/v1/schema/${CLASS_NAME}`));
  if (schemaResponse.ok) return;
  if (schemaResponse.status !== 404) {
    throw new AiError('No se pudo comprobar el esquema de Weaviate.', 'WEAVIATE_UNAVAILABLE', 503);
  }

  const createResponse = await fetch(weaviateUrl('/v1/schema'), {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      class: CLASS_NAME,
      description: 'Documentos publicos usados por el asistente de Relevo',
      vectorizer: 'text2vec-transformers',
      moduleConfig: {
        'text2vec-transformers': {
          poolingStrategy: 'masked_mean',
          vectorizeClassName: false
        }
      },
      properties: [
        { name: 'kind', dataType: ['text'] },
        { name: 'sourceId', dataType: ['text'] },
        { name: 'title', dataType: ['text'] },
        { name: 'content', dataType: ['text'] },
        { name: 'visibility', dataType: ['text'] },
        { name: 'updatedAt', dataType: ['date'] }
      ]
    })
  });

  if (!createResponse.ok) {
    throw new AiError('No se pudo crear el esquema de Weaviate.', 'WEAVIATE_SCHEMA_FAILED', 503);
  }
};

const deleteWeaviateSchema = async (): Promise<void> => {
  const response = await fetch(weaviateUrl(`/v1/schema/${CLASS_NAME}`), { method: 'DELETE' });
  if (!response.ok && response.status !== 404) {
    throw new AiError('No se pudo limpiar el esquema de Weaviate.', 'WEAVIATE_SCHEMA_DELETE_FAILED', 503);
  }
};

const upsertDocument = async (document: AssistantDocument): Promise<void> => {
  await ensureWeaviateSchema();
  const id = stableUuidFromSource(document.kind, document.sourceId);

  await deleteDocument(document.kind, document.sourceId);

  const response = await fetch(weaviateUrl('/v1/objects'), {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      id,
      class: CLASS_NAME,
      properties: document
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(
      { status: response.status, error: errorText, sourceId: document.sourceId, kind: document.kind },
      'Weaviate devolvio error al indexar documento'
    );
    throw new AiError('No se pudo indexar el documento en Weaviate.', 'WEAVIATE_INDEX_FAILED', 503);
  }
};

const deleteDocument = async (kind: DocumentKind, sourceId: string): Promise<void> => {
  const id = stableUuidFromSource(kind, sourceId);
  const response = await fetch(weaviateUrl(`/v1/objects/${id}`), { method: 'DELETE' });
  if (!response.ok && response.status !== 404) {
    throw new AiError('No se pudo eliminar el documento de Weaviate.', 'WEAVIATE_DELETE_FAILED', 503);
  }
};

const offerToDocument = (oferta: IOferta): AssistantDocument => ({
  kind: 'OFFER',
  sourceId: String(oferta._id),
  title: `Oferta ${oferta.sector} en ${oferta.region}`,
  content: [
    `Sector: ${oferta.sector}.`,
    `Region: ${oferta.region}.`,
    oferta.revenueRange ? `Rango de facturacion: ${oferta.revenueRange}.` : '',
    oferta.employeeRange ? `Rango de empleados: ${oferta.employeeRange}.` : '',
    oferta.creationYear ? `Ano de creacion: ${oferta.creationYear}.` : '',
    `Descripcion: ${oferta.companyDescription}.`,
    oferta.extendedDescription ? `Detalle adicional publico: ${oferta.extendedDescription}.` : ''
  ]
    .filter(Boolean)
    .join(' '),
  visibility: 'PUBLIC',
  updatedAt: new Date().toISOString()
});

export const syncOfertaToWeaviate = async (oferta: IOferta): Promise<void> => {
  await upsertDocument(offerToDocument(oferta));
};

export const removeOfertaFromWeaviate = async (ofertaId: string): Promise<void> => {
  await deleteDocument('OFFER', ofertaId);
};

export const syncOfertaToWeaviateSafe = async (oferta: IOferta): Promise<void> => {
  try {
    await syncOfertaToWeaviate(oferta);
  } catch (error) {
    logger.warn({ error, ofertaId: oferta._id }, 'No se pudo sincronizar la oferta con Weaviate');
  }
};

export const removeOfertaFromWeaviateSafe = async (ofertaId: string): Promise<void> => {
  try {
    await removeOfertaFromWeaviate(ofertaId);
  } catch (error) {
    logger.warn({ error, ofertaId }, 'No se pudo eliminar la oferta de Weaviate');
  }
};

const searchDocuments = async (message: string): Promise<AssistantDocument[]> => {
  await ensureWeaviateSchema();
  const query = `
    {
      Get {
        ${CLASS_NAME}(
          nearText: { concepts: ["${sanitizeGraphqlString(message)}"] }
          limit: 6
        ) {
          kind
          sourceId
          title
          content
          visibility
          updatedAt
        }
      }
    }
  `;

  const response = await fetch(weaviateUrl('/v1/graphql'), {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    throw new AiError('Weaviate no esta disponible para buscar contexto.', 'WEAVIATE_UNAVAILABLE', 503);
  }

  const data = (await response.json()) as { data?: { Get?: Record<string, AssistantDocument[]> } };
  return data.data?.Get?.[CLASS_NAME] ?? [];
};

const buildPersonalContext = async (user?: IJwtPayload): Promise<string> => {
  if (!user) return '';

  const [profile, favorites, solicitudes, chats] = await Promise.all([
    UsuarioModel.findById(user.id)
      .select('roles fullName location bio professionalBackground preferredRegions favoriteOfferIds')
      .lean(),
    OfertaModel.find({ _id: { $in: [] } }).lean(),
    SolicitudModel.find({ $or: [{ interestedUser: user.id }, { owner: user.id }] })
      .populate('opportunity', 'sector region companyDescription')
      .populate('owner', 'fullName')
      .limit(5)
      .sort({ updatedAt: -1 })
      .lean(),
    ChatModel.find({ $or: [{ interested: user.id }, { owner: user.id }] })
      .populate('oferta', 'sector region companyDescription')
      .limit(5)
      .sort({ updatedAt: -1 })
      .lean()
  ]);

  const favoriteIds = profile?.favoriteOfferIds ?? [];
  const favoriteOffers =
    favoriteIds.length > 0
      ? await OfertaModel.find({ _id: { $in: favoriteIds } }).select('sector region companyDescription').lean()
      : favorites;

  const profileText = profile
    ? [
        `Nombre: ${profile.fullName}.`,
        `Roles: ${profile.roles?.join(', ') || 'sin rol'}.`,
        profile.location ? `Ubicacion: ${profile.location}.` : '',
        profile.preferredRegions?.length ? `Regiones preferidas: ${profile.preferredRegions.join(', ')}.` : '',
        profile.bio ? `Bio: ${profile.bio}.` : '',
        profile.professionalBackground ? `Experiencia: ${profile.professionalBackground}.` : ''
      ]
        .filter(Boolean)
        .join(' ')
    : '';

  const favoritesText = favoriteOffers
    .map((oferta) => `Favorita: ${oferta.sector} en ${oferta.region}. ${oferta.companyDescription}`)
    .join('\n');

  const solicitudesText = solicitudes
    .map((solicitud) => {
      const opportunity = solicitud.opportunity as unknown as { sector?: string; region?: string };
      return `Solicitud ${solicitud.status}: ${opportunity?.sector ?? 'oferta'} en ${opportunity?.region ?? 'region no indicada'}.`;
    })
    .join('\n');

  const chatsText = chats
    .map((chat) => {
      const oferta = chat.oferta as unknown as { sector?: string; region?: string };
      return `Chat ${chat.status}: ${oferta?.sector ?? 'oferta'} en ${oferta?.region ?? 'region no indicada'}.`;
    })
    .join('\n');

  return [profileText, favoritesText, solicitudesText, chatsText].filter(Boolean).join('\n');
};

const callLlm = async (prompt: string): Promise<string> => {
  const response = await fetch(`${config.llm.url.replace(/\/$/, '')}/api/generate`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      model: config.llm.model,
      prompt,
      stream: false
    })
  });

  if (!response.ok) {
    throw new AiError('El modelo de IA no esta disponible.', 'LLM_UNAVAILABLE', 503);
  }

  const data = (await response.json()) as { response?: string };
  return data.response?.trim() || 'No he podido generar una respuesta con la informacion disponible.';
};

export const reindexAssistantDocuments = async (): Promise<{ indexed: number }> => {
  await deleteWeaviateSchema();
  await ensureWeaviateSchema();

  const ofertas = await OfertaModel.find().lean();
  const documents = [...platformDocuments, ...ofertas.map(offerToDocument)];

  for (const document of documents) {
    await upsertDocument(document);
  }

  return { indexed: documents.length };
};

export const askAssistant = async (message: string, user?: IJwtPayload): Promise<AssistantResponse> => {
  const mode: AssistantMode = user ? 'AUTHENTICATED' : 'PUBLIC';
  const shouldSearchDocuments = !isGreetingOnly(message);
  const documents = shouldSearchDocuments ? await searchDocuments(message) : [];
  const personalContext = await buildPersonalContext(user);
  const context = documents.map((doc) => `[${doc.kind}] ${doc.title}: ${doc.content}`).join('\n');

  const prompt = `
Eres el asistente de Relevo, una plataforma para conectar propietarios de pymes que quieren vender por jubilacion con personas interesadas en adquirir empresas.
Responde en espanol, de forma clara y breve.
No inventes datos. Si no hay informacion suficiente, dilo y sugiere revisar el marketplace o el perfil.
No des asesoramiento legal ni digas que Relevo gestiona papeleo, reuniones o compraventas finales.
Si la pregunta es solo un saludo, responde con un saludo natural y pregunta en que puedes ayudar sobre Relevo.
Modo de usuario: ${mode}.

Contexto recuperado de Weaviate:
${context || 'No hay documentos relevantes.'}

Contexto del usuario logueado:
${personalContext || 'No hay contexto personal disponible.'}

Pregunta:
${message}
`;

  const answer = await callLlm(prompt);

  return {
    answer,
    mode,
    sources: documents.map((doc) => ({ kind: doc.kind, sourceId: doc.sourceId, title: doc.title }))
  };
};

export const indexPlatformDocumentsSafe = async (): Promise<void> => {
  try {
    for (const document of platformDocuments) {
      await upsertDocument(document);
    }
  } catch (error) {
    logger.warn({ error }, 'No se pudieron indexar los documentos fijos del asistente');
  }
};
