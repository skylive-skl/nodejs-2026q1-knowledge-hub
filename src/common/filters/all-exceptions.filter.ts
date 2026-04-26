import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { AppLoggerService } from '../logger/app-logger.service';
import { AppError } from '../errors/app-error';

type ErrorResponseBody = {
  statusCode: number;
  error: string;
  message: string;
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      return;
    }

    const httpContext = host.switchToHttp();
    const response = httpContext.getResponse<Response>();
    const request = httpContext.getRequest<Request>();

    const { statusCode, body } = this.buildErrorResponse(exception);

    const errorToLog =
      exception instanceof Error ? exception : new Error(String(exception));

    this.logger.error(
      {
        method: request.method,
        url: request.originalUrl ?? request.url,
        statusCode,
        message: errorToLog.message,
        stack: errorToLog.stack,
      },
      'GlobalExceptionFilter',
    );

    response.status(statusCode).json(body);
  }

  private buildErrorResponse(exception: unknown): {
    statusCode: number;
    body: ErrorResponseBody;
  } {
    if (exception instanceof AppError) {
      const statusCode = exception.statusCode;
      return {
        statusCode,
        body: {
          statusCode,
          error: this.getReasonPhrase(statusCode),
          message: exception.message,
        },
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();
      const message = this.resolveHttpExceptionMessage(exception, response);
      const error = this.resolveHttpExceptionError(statusCode, response);

      return {
        statusCode,
        body: {
          statusCode,
          error,
          message,
        },
      };
    }

    return {
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      body: {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      },
    };
  }

  private resolveHttpExceptionMessage(
    exception: HttpException,
    response: string | object,
  ): string {
    if (typeof response === 'string') {
      return response;
    }

    if (
      typeof response === 'object' &&
      response !== null &&
      'message' in response
    ) {
      const candidate = (response as { message: string | string[] }).message;
      if (Array.isArray(candidate)) {
        return candidate.join(', ');
      }

      return candidate;
    }

    return exception.message;
  }

  private resolveHttpExceptionError(
    statusCode: number,
    response: string | object,
  ): string {
    if (
      typeof response === 'object' &&
      response !== null &&
      'error' in response &&
      typeof (response as { error: unknown }).error === 'string'
    ) {
      return (response as { error: string }).error;
    }

    return this.getReasonPhrase(statusCode);
  }

  private getReasonPhrase(statusCode: number): string {
    try {
      return getReasonPhrase(statusCode);
    } catch {
      return 'Error';
    }
  }
}
