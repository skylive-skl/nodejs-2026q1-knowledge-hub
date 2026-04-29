import {
  Injectable,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { User } from 'src/common/interfaces';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from 'src/common/enums';
import { SearchUserDto } from './dto/search-user.dto';
import { paginate, shouldPaginate, sortItems } from 'src/common/pagination';
import { PrismaService } from 'src/prisma/prisma.service';
import { ForbiddenError } from 'src/common/errors/forbidden.error';
import { NotFoundError } from 'src/common/errors/not-found.error';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private toUser(entity: {
    id: string;
    login: string;
    password: string;
    role: string;
    createdAt: bigint;
    updatedAt: bigint;
  }): User {
    return {
      id: entity.id,
      login: entity.login,
      password: entity.password,
      role: entity.role as UserRole,
      createdAt: Number(entity.createdAt),
      updatedAt: Number(entity.updatedAt),
    };
  }

  async findAll(query: SearchUserDto = {}): Promise<any> {
    const { sortBy, order, page, limit } = query;
    const users = await this.prisma.user.findMany();
    const normalizedUsers = users.map((user) => this.toUser(user));

    const sortedUsers = sortItems(normalizedUsers, sortBy, order, [
      'login',
      'role',
      'createdAt',
      'updatedAt',
    ]);

    if (shouldPaginate(page, limit)) {
      return paginate(sortedUsers, page, limit);
    }

    return sortedUsers;
  }

  async findOne(id: string): Promise<User | undefined> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError(`User with id ${id} not found`);
    return this.toUser(user);
  }

  async create(dto: CreateUserDto): Promise<User> {
    const salt = this.configService.get('CRYPT_SALT');
    const hash = await bcrypt.hash(dto.password, +salt);
    const now = BigInt(Date.now());

    const user = await this.prisma.user.create({
      data: {
        login: dto.login,
        password: hash,
        role: dto.role || UserRole.VIEWER,
        createdAt: now,
        updatedAt: now,
      },
    });

    return this.toUser(user);
  }

  async updatePassword(
    id: string,
    dto: UpdateUserPasswordDto,
  ): Promise<User | undefined> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError(`User with id ${id} not found`);

    const isOldPassword = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isOldPassword)
      throw new ForbiddenError('Old password is incorrect');

    if (dto.oldPassword === dto.newPassword)
      throw new ForbiddenError(
        'New password must be different from the old one',
      );

    const salt = this.configService.get('CRYPT_SALT');
    const hash = await bcrypt.hash(dto.newPassword, +salt);

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { password: hash, updatedAt: BigInt(Date.now()) },
    });

    return this.toUser(updatedUser);
  }

  async updateRole(id: string, dto: UpdateUserRoleDto): Promise<User | undefined> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError(`User with id ${id} not found`);

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role, updatedAt: BigInt(Date.now()) },
    });

    return this.toUser(updatedUser);
  }

  async remove(id: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError(`User with id ${id} not found`);

    await this.prisma.user.delete({ where: { id } });
    return true;
  }
}
