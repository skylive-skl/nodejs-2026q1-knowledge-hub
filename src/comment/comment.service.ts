import { Injectable } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentRepository } from './comment.repository';
import { randomUUID } from 'crypto';

@Injectable()
export class CommentService {
  constructor(private readonly commentRepository: CommentRepository) {}

  create(dto: CreateCommentDto) {
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
    return this.commentRepository.findById(id);
  }

  update(id: string, updateCommentDto: UpdateCommentDto) {
    return this.commentRepository.update(id, updateCommentDto);
  }

  remove(id: string) {
    return this.commentRepository.delete(id);
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
