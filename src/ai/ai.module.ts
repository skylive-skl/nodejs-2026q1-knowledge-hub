import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiService } from './gemini.service';
import { AiUsageService } from './ai-usage.service';
import { AiRateLimitGuard } from './guards/ai-rate-limit.guard';
import { ArticleModule } from 'src/article/article.module';

@Module({
  imports: [ArticleModule],
  controllers: [AiController],
  providers: [AiService, GeminiService, AiUsageService, AiRateLimitGuard],
  exports: [AiService],
})
export class AiModule {}
