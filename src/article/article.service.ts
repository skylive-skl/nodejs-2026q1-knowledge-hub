import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticleRepository } from './article.repository';
import { Article } from 'src/common/interfaces';
import { v4 as uuidv4 } from 'uuid';
import { ArticleStatus } from 'src/common/enums';
import { CommentService } from 'src/comment/comment.service';

@Injectable()
export class ArticleService {
  constructor(
    private readonly articleRepository: ArticleRepository,
    @Inject(forwardRef(() => CommentService))
    private readonly commentService: CommentService,
  ) {}

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
    const article = this.articleRepository.findById(id);
    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }
    return article;
  }

  update(id: string, updateArticleDto: UpdateArticleDto) {
    const updatedArticle = this.articleRepository.update(id, updateArticleDto);
    if (!updatedArticle) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }
    return updatedArticle;
  }

  remove(id: string) {
    this.findOne(id);
    this.commentService.removeByArticle(id);
    this.articleRepository.delete(id);
  }

  exists(id: string): boolean {
    return this.articleRepository.findById(id) !== undefined;
  }

  nullifyCategory(categoryId: string) {
    const articles = this.articleRepository.findAll(
      undefined,
      undefined,
      categoryId,
    );
    articles.forEach((article) => {
      this.articleRepository.update(article.id, { categoryId: null });
    });
  }

  nullifyAuthor(authorId: string) {
    const articles = this.articleRepository.findAll(
      undefined,
      undefined,
      undefined,
    );
    articles
      .filter((article) => article.authorId === authorId)
      .forEach((article) => {
        this.articleRepository.update(article.id, { authorId: null });
      });
  }
}
