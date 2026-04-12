import { Module, forwardRef } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { ArticleModule } from 'src/article/article.module';

@Module({
  imports: [forwardRef(() => ArticleModule)],
  controllers: [CommentController],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}
