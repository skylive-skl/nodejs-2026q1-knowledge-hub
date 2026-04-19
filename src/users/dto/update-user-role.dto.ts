import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from 'src/common/enums';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserRoleDto {
  @ApiProperty({ enum: UserRole, default: UserRole.VIEWER })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
}
