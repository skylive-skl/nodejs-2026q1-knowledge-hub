import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

@Injectable()
export class AiRateLimitGuard implements CanActivate {
  private readonly rpm: number;
  private readonly requests = new Map<string, number[]>();

  constructor(private readonly config: ConfigService) {
    this.rpm = this.config.get<number>('AI_RATE_LIMIT_RPM') ?? 20;
  }

  canActivate(context: ExecutionContext): boolean {
    if (process.env.DISABLE_THROTTLE_FOR_TESTS === 'true') {
      return true;
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const ip = request.ip ?? 'unknown';
    const now = Date.now();
    const windowMs = 60_000;
    const windowStart = now - windowMs;

    const timestamps = (this.requests.get(ip) ?? []).filter(
      (ts) => ts > windowStart,
    );

    if (timestamps.length >= this.rpm) {
      const oldestInWindow = timestamps[0];
      const retryAfterSec = Math.ceil((oldestInWindow + windowMs - now) / 1000);
      response.setHeader('Retry-After', String(retryAfterSec));
      throw new HttpException(
        'Too Many Requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    timestamps.push(now);
    this.requests.set(ip, timestamps);
    return true;
  }
}
