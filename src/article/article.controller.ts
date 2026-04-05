import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ArticleService } from './article.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { SearchArticleDto } from './dto/search-article.dto';
import { UUIDDto } from 'src/common/dto/uuid.dto';

@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Post()
  create(@Body() createArticleDto: CreateArticleDto) {
    return this.articleService.create(createArticleDto);
  }

  @Get()
  findAll(@Query() query: SearchArticleDto) {
    const { status, tag, categoryId } = query;
    return this.articleService.findAll(status, tag, categoryId);
  }

  @Get(':id')
  findOne(@Param() params: UUIDDto) {
    const { id } = params;
    return this.articleService.findOne(id);
  }

  @Patch(':id')
  update(@Param() params: UUIDDto, @Body() updateArticleDto: UpdateArticleDto) {
    const { id } = params;
    return this.articleService.update(id, updateArticleDto);
  }

  @Delete(':id')
  remove(@Param() params: UUIDDto) {
    const { id } = params;
    return this.articleService.remove(id);
  }
}
