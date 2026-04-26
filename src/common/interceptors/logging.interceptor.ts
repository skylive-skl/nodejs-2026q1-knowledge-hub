import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { Request, Response } from 'express';
import { AppLoggerService } from '../logger/app-logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const start = Date.now();
    const requestPayload = {
      method: request.method,
      url: request.originalUrl ?? request.url,
      query: sanitizeSensitiveData(request.query),
      body: sanitizeSensitiveData(request.body),
    };

    this.logger.log(requestPayload, 'IncomingRequest');

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - start;
        this.logger.log(
          {
            statusCode: response.statusCode,
            responseTimeMs: durationMs,
          },
          'OutgoingResponse',
        );
      }),
      catchError((error: unknown) => {
        const durationMs = Date.now() - start;
        const statusCode =
          error instanceof HttpException ? error.getStatus() : response.statusCode;
        this.logger.warn(
          {
            statusCode,
            responseTimeMs: durationMs,
          },
          'OutgoingResponse',
        );

        return throwError(() => error);
      }),
    );
  }
}

const SENSITIVE_KEYS = ['password', 'token', 'accessToken', 'refreshToken'];

function sanitizeSensitiveData(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSensitiveData(item, seen));
  }

  if (typeof value === 'object') {
    if (seen.has(value as object)) {
      return '[Circular]';
    }

    seen.add(value as object);

    const source = value as Record<string, unknown>;
    const target: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(source)) {
      if (isSensitiveKey(key)) {
        target[key] = '[REDACTED]';
        continue;
      }

      target[key] = sanitizeSensitiveData(nestedValue, seen);
    }

    return target;
  }

  return value;
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEYS.some((item) => normalized.includes(item.toLowerCase()));
}
