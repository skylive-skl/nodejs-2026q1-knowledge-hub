import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentRepository } from './comment.repository';
import { randomUUID } from 'crypto';
import { ArticleService } from 'src/article/article.service';

@Injectable()
export class CommentService {
  constructor(
    private readonly commentRepository: CommentRepository,
    @Inject(forwardRef(() => ArticleService))
    private readonly articleService: ArticleService,
  ) {}

  create(dto: CreateCommentDto) {
    if (!this.articleService.exists(dto.articleId)) {
      throw new UnprocessableEntityException(
        `Article with ID ${dto.articleId} does not exist`,
      );
    }

    const now = Date.now();
    const comment = {
      id: randomUUID(),
      ...dto,
      createdAt: now,
    };
    return this.commentRepository.create(comment);
  }

  findAll(articleId: string) {
    return this.commentRepository.findAll(articleId);
  }

  findOne(id: string) {
    const comment = this.commentRepository.findById(id);
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }
    return comment;
  }

  update(id: string, updateCommentDto: UpdateCommentDto) {
    return this.commentRepository.update(id, updateCommentDto);
  }

  remove(id: string) {
    this.findOne(id);
    this.commentRepository.delete(id);
  }

  removeByAuthor(authorId: string) {
    const comments = this.commentRepository
      .findAll()
      .filter((comment) => comment.authorId === authorId);
    comments.forEach((comment) => {
      this.commentRepository.delete(comment.id);
    });
  }

  removeByArticle(articleId: string) {
    const comments = this.commentRepository
      .findAll()
      .filter((comment) => comment.articleId === articleId);
    comments.forEach((comment) => {
      this.commentRepository.delete(comment.id);
    });
  }
}
