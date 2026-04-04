import { IsString } from 'class-validator';

export class UpdateUserPasswordDto {
  @IsString()
  oldPassword: string;
  @IsString()
  newPassword: string;
}
