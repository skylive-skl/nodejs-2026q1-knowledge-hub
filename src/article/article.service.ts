import { Injectable } from '@nestjs/common';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticleRepository } from './article.repository';
import { Article } from 'src/common/interfaces';
import { v4 as uuidv4 } from 'uuid';
import { ArticleStatus } from 'src/common/enums';

@Injectable()
export class ArticleService {
  constructor(private readonly articleRepository: ArticleRepository) {}

  create(dto: CreateArticleDto) {
    const now = Date.now();
    const article: Article = {
      id: uuidv4(),
      title: dto.title,
      content: dto.content,
      authorId: dto.authorId,
      categoryId: dto.categoryId,
      tags: dto.tags,
      status: dto.status ?? ArticleStatus.DRAFT,
      createdAt: now,
      updatedAt: now,
    };
    return this.articleRepository.create(article);
  }

  findAll(status: string, tag: string, categoryId: string) {
    return this.articleRepository.findAll(status, tag, categoryId);
  }

  findOne(id: string) {
    return this.articleRepository.findById(id.toString());
  }

  update(id: string, updateArticleDto: UpdateArticleDto) {
    return this.articleRepository.update(id.toString(), updateArticleDto);
  }

  remove(id: string) {
    return this.articleRepository.delete(id.toString());
  }
}
