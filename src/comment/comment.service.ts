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
      ...dto,
      id: randomUUID(),
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
}
