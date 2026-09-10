import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const method = request.method;
    const path = request.originalUrl || request.url;
    const ip = request.ip || request.socket?.remoteAddress || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let details: unknown;

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        `Unhandled exception for ${method} ${path} from ${ip}`,
        exception instanceof Error ? exception.stack : String(exception)
      );
    }

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (exceptionResponse && typeof exceptionResponse === 'object') {
        const body = exceptionResponse as Record<string, unknown>;
        if (body.message) {
          message = body.message as string | string[];
        }
        if (body.error) {
          details = body.error;
        }
      }
    }

    response.status(status).json({
      success: false,
      error: {
        status_code: status,
        message,
        details
      },
      path: request.url,
      timestamp: new Date().toISOString()
    });
  }
}
