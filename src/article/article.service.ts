import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { Article } from 'src/common/interfaces';
import { ArticleStatus } from 'src/common/enums';
import { CommentService } from 'src/comment/comment.service';
import { SearchArticleDto } from './dto/search-article.dto';
import { paginate, shouldPaginate, sortItems } from 'src/common/pagination';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ArticleService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => CommentService))
    private readonly commentService: CommentService,
  ) {}

  private toArticle(entity: {
    id: string;
    title: string;
    content: string;
    status: string;
    authorId: string | null;
    categoryId: string | null;
    createdAt: bigint;
    updatedAt: bigint;
    tags: Array<{ name: string }>;
  }): Article {
    return {
      id: entity.id,
      title: entity.title,
      content: entity.content,
      status: entity.status as ArticleStatus,
      authorId: entity.authorId,
      categoryId: entity.categoryId,
      tags: entity.tags.map((tag) => tag.name),
      createdAt: Number(entity.createdAt),
      updatedAt: Number(entity.updatedAt),
    };
  }

  async create(dto: CreateArticleDto) {
    const article = await this.prisma.article.create({
      data: {
        title: dto.title,
        content: dto.content,
        authorId: dto.authorId,
        categoryId: dto.categoryId,
        status: dto.status ?? ArticleStatus.DRAFT,
        createdAt: BigInt(Date.now()),
        updatedAt: BigInt(Date.now()),
        tags: {
          connectOrCreate: dto.tags.map((tagName) => ({
            where: { name: tagName },
            create: { name: tagName },
          })),
        },
      },
      include: {
        tags: {
          select: { name: true },
        },
      },
    });

    return this.toArticle(article);
  }

  async findAll(query: SearchArticleDto) {
    const { status, tag, categoryId, sortBy, order, page, limit } = query;

    const where = {
      ...(status ? { status } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(tag ? { tags: { some: { name: tag } } } : {}),
    };

    const articles = await this.prisma.article.findMany({
      where,
      include: {
        tags: {
          select: { name: true },
        },
      },
    });

    const normalizedArticles = articles.map((article) =>
      this.toArticle(article),
    );

    const sortedArticles = sortItems(normalizedArticles, sortBy, order, [
      'title',
      'status',
      'createdAt',
      'updatedAt',
    ]);

    if (shouldPaginate(page, limit)) {
      return paginate(sortedArticles, page, limit);
    }

    return sortedArticles;
  }

  async findOne(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        tags: {
          select: { name: true },
        },
      },
    });

    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }

    return this.toArticle(article);
  }

  async update(id: string, updateArticleDto: UpdateArticleDto) {
    const existingArticle = await this.prisma.article.findUnique({
      where: { id },
    });

    if (!existingArticle) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }

    const { tags, ...rest } = updateArticleDto;

    const updatedArticle = await this.prisma.article.update({
      where: { id },
      data: {
        ...rest,
        updatedAt: BigInt(Date.now()),
        ...(tags
          ? {
              tags: {
                set: [],
                connectOrCreate: tags.map((tagName) => ({
                  where: { name: tagName },
                  create: { name: tagName },
                })),
              },
            }
          : {}),
      },
      include: {
        tags: {
          select: { name: true },
        },
      },
    });

    return this.toArticle(updatedArticle);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.article.delete({ where: { id } });
  }

  async exists(id: string): Promise<boolean> {
    const article = await this.prisma.article.findUnique({
      where: { id },
      select: { id: true },
    });

    return !!article;
  }
}
