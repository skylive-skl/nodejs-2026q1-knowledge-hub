import { StatusCodes } from 'http-status-codes';
import { AppError } from './app-error';

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(StatusCodes.NOT_FOUND, message);
  }
}
