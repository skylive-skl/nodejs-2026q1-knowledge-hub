import { StatusCodes } from 'http-status-codes';
import { AppError } from 'src/common/errors/app-error';

export class GeminiUnavailableError extends AppError {
  constructor(message = 'AI service is temporarily unavailable') {
    super(StatusCodes.SERVICE_UNAVAILABLE, message);
  }
}
