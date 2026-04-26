import { StatusCodes } from 'http-status-codes';
import { AppError } from './app-error';

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(StatusCodes.FORBIDDEN, message);
  }
}
