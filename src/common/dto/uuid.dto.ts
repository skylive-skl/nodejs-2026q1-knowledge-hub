import { IsUUID } from 'class-validator';

export class UUIDDto {
  @IsUUID(4, { message: 'ID must be a valid UUID v4' })
  id: string;
}
