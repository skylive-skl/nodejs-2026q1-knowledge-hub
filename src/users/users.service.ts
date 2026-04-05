import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { User } from 'src/common/interfaces';

import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { ConfigService } from '@nestjs/config';
import { UserRole } from 'src/common/enums';
import { ArticleService } from 'src/article/article.service';
import { CommentService } from 'src/comment/comment.service';
import { SearchUserDto } from './dto/search-user.dto';
import { paginate, shouldPaginate, sortItems } from 'src/common/pagination';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly configService: ConfigService,
    private readonly articleService: ArticleService,
    private readonly commentService: CommentService,
  ) {}

  async findAll(query: SearchUserDto = {}): Promise<any> {
    const { sortBy, order, page, limit } = query;
    const sortedUsers = sortItems(this.usersRepo.findAll(), sortBy, order, [
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
    const user = this.usersRepo.findById(id);
    if (!user) throw new NotFoundException(`User with id ${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const salt = this.configService.get('CRYPT_SALT');
    const hash = await bcrypt.hash(dto.password, +salt);
    const now = Date.now();
    const user: User = {
      id: randomUUID(),
      login: dto.login,
      password: hash,
      role: dto.role || UserRole.VIEWER,
      createdAt: now,
      updatedAt: now,
    };
    return this.usersRepo.create(user);
  }

  async updatePassword(
    id: string,
    dto: UpdateUserPasswordDto,
  ): Promise<User | undefined> {
    const user = this.usersRepo.findById(id);
    if (!user) throw new NotFoundException(`User with id ${id} not found`);

    const isOldPassword = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isOldPassword)
      throw new ForbiddenException('Old password is incorrect');

    if (dto.oldPassword === dto.newPassword)
      throw new ForbiddenException(
        'New password must be different from the old one',
      );

    const salt = this.configService.get('CRYPT_SALT');
    const hash = await bcrypt.hash(dto.newPassword, +salt);
    return this.usersRepo.update(id, { password: hash, updatedAt: Date.now() });
  }

  async remove(id: string): Promise<boolean> {
    const user = this.usersRepo.findById(id);
    if (!user) throw new NotFoundException(`User with id ${id} not found`);
    this.articleService.nullifyAuthor(id);
    this.commentService.removeByAuthor(id);
    return this.usersRepo.delete(id);
  }
}
