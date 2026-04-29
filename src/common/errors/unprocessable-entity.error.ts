import { StatusCodes } from 'http-status-codes';
import { AppError } from './app-error';

export class UnprocessableEntityError extends AppError {
  constructor(message = 'Unprocessable entity') {
    super(StatusCodes.UNPROCESSABLE_ENTITY, message);
  }
}
