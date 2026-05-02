import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiService } from './gemini.service';
import { AiUsageService } from './ai-usage.service';
import { AiSessionService } from './ai-session.service';
import { AiRateLimitGuard } from './guards/ai-rate-limit.guard';
import { ArticleModule } from 'src/article/article.module';
import { AppLoggerService } from 'src/common/logger/app-logger.service';

@Module({
  imports: [ArticleModule],
  controllers: [AiController],
  providers: [
    AiService,
    GeminiService,
    AiUsageService,
    AiSessionService,
    AiRateLimitGuard,
    AppLoggerService,
  ],
  exports: [AiService],
})
export class AiModule {}
