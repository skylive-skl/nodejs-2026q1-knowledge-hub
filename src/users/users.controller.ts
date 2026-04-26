import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { validate as validateUUID } from 'uuid';
import { UserEntity } from './users.entity';
import { UUIDDto } from 'src/common/dto/uuid.dto';
import { SearchUserDto } from './dto/search-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/common/enums';
import { ValidationError } from 'src/common/errors/validation.error';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto): Promise<UserEntity> {
    const user = await this.usersService.create(createUserDto);
    return new UserEntity(user);
  }

  @Get()
  async findAll(@Query() query: SearchUserDto): Promise<any> {
    const users = await this.usersService.findAll(query);

    if (Array.isArray(users)) {
      return users.map((user) => new UserEntity(user));
    }

    return {
      ...users,
      data: users.data.map((user) => new UserEntity(user)),
    };
  }

  @Get(':id')
  async findOne(@Param() params: UUIDDto): Promise<UserEntity> {
    const { id } = params;
    const user = await this.usersService.findOne(id);
    return new UserEntity(user);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  async updatePassword(
    @Param() params: UUIDDto,
    @Body() dto: UpdateUserPasswordDto,
  ): Promise<UserEntity> {
    const { id } = params;
    const user = await this.usersService.updatePassword(id, dto);
    return new UserEntity(user);
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  async updateRole(
    @Param() params: UUIDDto,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<UserEntity> {
    const { id } = params;
    const user = await this.usersService.updateRole(id, dto);
    return new UserEntity(user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param() params: UUIDDto): Promise<void> {
    const { id } = params;
    if (!validateUUID(id)) {
      throw new ValidationError(`Invalid UUID: ${id}`);
    }
    await this.usersService.remove(id);
  }
}
