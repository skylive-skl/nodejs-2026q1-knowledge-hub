import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ArticleService } from 'src/article/article.service';
import { SearchCommentDto } from './dto/search-comment.dto';
import { paginate, shouldPaginate, sortItems } from 'src/common/pagination';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotFoundError } from 'src/common/errors/not-found.error';
import { UnprocessableEntityError } from 'src/common/errors/unprocessable-entity.error';

@Injectable()
export class CommentService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ArticleService))
    private readonly articleService: ArticleService,
  ) {}

  private toComment(entity: {
    id: string;
    content: string;
    articleId: string;
    authorId: string | null;
    createdAt: bigint;
  }) {
    return {
      id: entity.id,
      content: entity.content,
      articleId: entity.articleId,
      authorId: entity.authorId,
      createdAt: Number(entity.createdAt),
    };
  }

  async create(dto: CreateCommentDto) {
    if (!(await this.articleService.exists(dto.articleId))) {
      throw new UnprocessableEntityError(
        `Article with ID ${dto.articleId} does not exist`,
      );
    }

    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        articleId: dto.articleId,
        authorId: dto.authorId,
        createdAt: BigInt(Date.now()),
      },
    });

    return this.toComment(comment);
  }

  async findAll(query: SearchCommentDto = {}) {
    const { articleId, sortBy, order, page, limit } = query;
    const comments = await this.prisma.comment.findMany({
      where: articleId ? { articleId } : undefined,
    });

    const normalizedComments = comments.map((comment) =>
      this.toComment(comment),
    );

    const sortedComments = sortItems(normalizedComments, sortBy, order, [
      'content',
      'createdAt',
    ]);

    if (shouldPaginate(page, limit)) {
      return paginate(sortedComments, page, limit);
    }

    return sortedComments;
  }

  async findOne(id: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      throw new NotFoundError(`Comment with ID ${id} not found`);
    }
    return this.toComment(comment);
  }

  async update(id: string, updateCommentDto: UpdateCommentDto) {
    await this.findOne(id);

    const updatedComment = await this.prisma.comment.update({
      where: { id },
      data: updateCommentDto,
    });

    return this.toComment(updatedComment);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.comment.delete({ where: { id } });
  }
}
