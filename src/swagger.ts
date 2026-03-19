import swaggerJsdoc from 'swagger-jsdoc';
import { apiPort } from './config.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Backend Relevo API',
      version: '1.0.0',
      description: 'Documentación oficial de los endpoints de la plataforma Relevo.',
    },
    servers: [
      {
        url: `http://localhost:${apiPort}`,
        description: 'Servidor local',
      },
    ],
    components: {
      responses: {
        NotFound: {
          description: 'Recurso no encontrado',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string' }
                }
              }
            }
          }
        },
        ServerError: {
          description: 'Error interno del servidor',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string' }
                }
              }
            }
          }
        },
        BadRequest: {
          description: 'Petición inválida',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string' }
                }
              }
            }
          }
        },
        Conflict: {
          description: 'Conflicto de datos únicos',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  code: {
                    type: 'string',
                    example: 'DUPLICATE_KEY'
                  }
                }
              }
            }
          }
        },
      }
    }
  },
  // Documentación de rutas y modelos
  apis: ['./src/routes/*.ts', './src/models/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
