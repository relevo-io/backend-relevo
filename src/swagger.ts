import swaggerJsdoc from 'swagger-jsdoc';
import { apiPort, config } from './config.js';

const isProd = process.env.NODE_ENV === 'production';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Backend Relevo API',
      version: '1.0.0',
      description: 'Documentación oficial de los endpoints de la plataforma Relevo.'
    },
    servers: [
      ...(config.apiUrl
        ? [
            {
              url: config.apiUrl,
              description: 'Servidor de producción'
            }
          ]
        : []),
      {
        url: '/',
        description: 'Servidor actual'
      },
      {
        url: `http://localhost:${apiPort}`,
        description: 'Servidor local'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
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
        }
      }
    }
  },
  // Documentación de rutas y modelos
  apis: isProd ? ['./dist/routes/*.js', './dist/models/*.js'] : ['./src/routes/*.ts', './src/models/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);
