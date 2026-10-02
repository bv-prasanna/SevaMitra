import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Normalizes every error response into the envelope documented in
 * docs/ARCHITECTURE.md §8: { error: { code, message, details } }.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = isHttpException ? exception.getResponse() : undefined;
    const { message, details } = this.normalize(body, exception);

    if (!isHttpException) {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
      );
    }

    response.status(status).json({
      error: {
        code: HttpStatus[status] ?? 'INTERNAL_SERVER_ERROR',
        message,
        details,
      },
    });
  }

  private normalize(
    body: unknown,
    exception: unknown,
  ): { message: string; details?: unknown } {
    if (typeof body === 'string') {
      return { message: body };
    }

    if (body && typeof body === 'object') {
      const {
        message,
        error: _error,
        statusCode: _s,
        ...rest
      } = body as Record<string, unknown>;
      const normalizedMessage = Array.isArray(message)
        ? message.join(', ')
        : ((message as string) ?? 'Unexpected error');
      const details = Object.keys(rest).length > 0 ? rest : undefined;
      return { message: normalizedMessage, details };
    }

    return {
      message:
        exception instanceof Error ? exception.message : 'Unexpected error',
    };
  }
}
