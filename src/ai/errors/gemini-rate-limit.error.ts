import { StatusCodes } from 'http-status-codes';
import { AppError } from 'src/common/errors/app-error';

export class GeminiRateLimitError extends AppError {
  constructor(retryAfterSec?: number) {
    const retryHint =
      typeof retryAfterSec === 'number' && Number.isFinite(retryAfterSec)
        ? ` Retry after ${Math.max(1, Math.floor(retryAfterSec))}s.`
        : '';
    super(
      StatusCodes.TOO_MANY_REQUESTS,
      `AI provider rate limit exceeded.${retryHint}`,
    );
  }
}
