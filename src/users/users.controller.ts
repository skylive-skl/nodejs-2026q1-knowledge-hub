import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { validate as validateUUID } from 'uuid';
import { UserEntity } from './users.entity';
import { UUIDDto } from 'src/common/dto/uuid.dto';
import { SearchUserDto } from './dto/search-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
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
  async updatePassword(
    @Param() params: UUIDDto,
    @Body() dto: UpdateUserPasswordDto,
  ): Promise<UserEntity> {
    const { id } = params;
    const user = await this.usersService.updatePassword(id, dto);
    return new UserEntity(user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param() params: UUIDDto): Promise<void> {
    const { id } = params;
    if (!validateUUID(id)) {
      throw new BadRequestException(`Invalid UUID: ${id}`);
    }
    await this.usersService.remove(id);
  }
}
