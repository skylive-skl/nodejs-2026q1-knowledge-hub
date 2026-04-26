import { StatusCodes } from 'http-status-codes';
import { AppError } from './app-error';

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(StatusCodes.BAD_REQUEST, message);
  }
}
