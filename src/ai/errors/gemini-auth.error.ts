import { StatusCodes } from 'http-status-codes';
import { AppError } from 'src/common/errors/app-error';

export class GeminiAuthError extends AppError {
  constructor() {
    super(StatusCodes.INTERNAL_SERVER_ERROR, 'AI service configuration error');
  }
}
