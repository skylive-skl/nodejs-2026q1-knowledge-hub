import { IsUUID } from 'class-validator';

export class UUIDDto {
  @IsUUID('4')
  id: string;
}
