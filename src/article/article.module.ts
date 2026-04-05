import { Module } from '@nestjs/common';
import { ArticleService } from './article.service';
import { ArticleController } from './article.controller';
import { ArticleRepository } from './article.repository';
import { CommentModule } from 'src/comment/comment.module';

@Module({
  imports: [CommentModule],
  controllers: [ArticleController],
  providers: [ArticleRepository, ArticleService],
  exports: [ArticleService],
})
export class ArticleModule {}
