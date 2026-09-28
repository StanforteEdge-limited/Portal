import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { HttpError } from '$core/errors';
import { Logger } from '$core/logger';

const logger = new Logger('ErrorHandler');

interface ErrorBody {
  status: number;
  message: string | string[];
  details?: unknown;
}

function describe(error: unknown, request: FastifyRequest): ErrorBody {
  if (error instanceof HttpError) {
    return { status: error.statusCode, message: error.message, details: error.code ? { code: error.code } : undefined };
  }

  const fastifyError = error as FastifyError;
  if (fastifyError && typeof fastifyError.statusCode === 'number' && fastifyError.statusCode >= 400) {
    const details = (fastifyError as any).validation
      ? { validation: (fastifyError as any).validation }
      : (fastifyError as any).code
        ? { code: (fastifyError as any).code }
        : undefined;
    return { status: fastifyError.statusCode, message: fastifyError.message, details };
  }

  const ip = request.ip || request.socket?.remoteAddress || 'unknown';
  const cause = (error as any)?.cause;
  const stack = error instanceof Error ? error.stack : String(error);
  logger.error(
    `Unhandled exception for ${request.method} ${request.url} from ${ip}`,
    cause ? `${stack}\ncause: ${cause?.stack ?? cause?.message ?? JSON.stringify(cause)}` : stack,
  );
  return { status: 500, message: 'Internal server error' };
}

/** Builds the Fastify error handler used by the API. */
export function buildErrorHandler(fastify: FastifyInstance) {
  return function errorHandler(error: unknown, request: FastifyRequest, reply: FastifyReply) {
    const { status, message, details } = describe(error, request);

    if (status >= 500) {
      fastify.log.error({ err: error }, `request failed: ${request.method} ${request.url}`);
    }

    const body: Record<string, unknown> = {
      success: false,
      error: {
        status_code: status,
        message,
        ...(details === undefined ? {} : { details }),
      },
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    reply.status(status).send(body);
  };
}
