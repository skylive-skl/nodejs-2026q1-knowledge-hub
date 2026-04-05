import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { validate as validateUUID } from 'uuid';
import { UserEntity } from './users.entity';
import { UUIDDto } from 'src/common/dto/uuid.dto';

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
  async findAll(): Promise<UserEntity[]> {
    const users = await this.usersService.findAll();
    return users.map((user) => new UserEntity(user));
  }

  @Get(':id')
  async findOne(@Param() params: UUIDDto): Promise<UserEntity> {
    const { id } = params;
    if (!validateUUID(id)) {
      throw new BadRequestException(`Invalid UUID: ${id}`);
    }
    const user = await this.usersService.findOne(id);
    return new UserEntity(user);
  }

  @Patch(':id')
  async updatePassword(
    @Param() params: UUIDDto,
    @Body() dto: UpdateUserPasswordDto,
  ): Promise<UserEntity> {
    const { id } = params;
    if (!validateUUID(id)) {
      throw new BadRequestException(`Invalid UUID: ${id}`);
    }
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
