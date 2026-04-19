import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ArticleService } from './article.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { SearchArticleDto } from './dto/search-article.dto';
import { UUIDDto } from 'src/common/dto/uuid.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  create(@Body() createArticleDto: CreateArticleDto) {
    return this.articleService.create(createArticleDto);
  }

  @Get()
  findAll(@Query() query: SearchArticleDto) {
    return this.articleService.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: UUIDDto) {
    const { id } = params;
    return this.articleService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  update(@Param() params: UUIDDto, @Body() updateArticleDto: UpdateArticleDto) {
    const { id } = params;
    return this.articleService.update(id, updateArticleDto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param() params: UUIDDto) {
    const { id } = params;
    return this.articleService.remove(id);
  }
}
