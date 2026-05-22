import { generarPresignedGet } from './storageService.js';
import { config, logger } from '../config.js';
import { IResultadoIa } from '../models/solicitudModel.js';
import { AiError } from '../utils/AppError.js';

/**
 * Solicita el análisis de un CV al microservicio de Python.
 * Genera una URL pre-firmada de lectura temporal de S3 y la envía por POST.
 * Maneja los errores traduciéndolos a la subclase AiError con códigos HTTP específicos.
 *
 * @param cvKey - La clave S3 del documento PDF del CV
 * @returns El resultado estructurado del análisis de IA
 */
export const solicitarAnalisisIA = async (cvKey: string): Promise<IResultadoIa> => {
  const pdfUrl = await generarPresignedGet(cvKey);
  const endpoint = `${config.pythonService.url}/api/v1/analyze`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.pythonService.apiKey
      },
      body: JSON.stringify({ pdf_url: pdfUrl })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, 'Error retornado por microservicio de IA');

      // 1. Si nos quedamos sin cuota o límites
      if (response.status === 429) {
        throw new AiError(
          'Se ha excedido el límite de solicitudes de la Inteligencia Artificial. Por favor, inténtelo más tarde.',
          'AI_QUOTA_EXCEEDED',
          429
        );
      }

      // 2. Si el PDF no se pudo leer o estaba vacío
      if (response.status === 400) {
        throw new AiError('El documento PDF no es válido o no contiene texto legible.', 'AI_INVALID_PDF', 400);
      }

      // 3. Otros errores del servicio
      throw new AiError(`Error del servicio de IA: ${errorText}`, 'AI_ANALYSIS_FAILED', response.status);
    }

    return (await response.json()) as IResultadoIa;
  } catch (error: any) {
    if (error instanceof AiError) {
      throw error;
    }
    // Si el microservicio de Python está apagado / no contesta o hay error de red/fetch
    if (error.code === 'ECONNREFUSED' || error.name === 'TypeError') {
      logger.error(error, 'El servicio de análisis de IA no está disponible');
      throw new AiError(
        'El servicio de análisis de IA no está disponible en este momento.',
        'AI_SERVICE_UNAVAILABLE',
        503
      );
    }
    logger.error(error, 'Error inesperado durante el análisis de IA');
    throw new AiError(`Error inesperado en el análisis de IA: ${error.message || error}`, 'AI_ANALYSIS_FAILED', 500);
  }
};
