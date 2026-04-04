import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from 'src/common/enums';

export class CreateUserDto {
  @IsString()
  login: string;

  @IsEnum(UserRole)
  @IsOptional()
  role: UserRole;

  @IsString()
  password: string;
}
