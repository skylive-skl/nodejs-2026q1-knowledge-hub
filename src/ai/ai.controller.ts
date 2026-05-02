import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { AiUsageService } from './ai-usage.service';
import {
  AiArticleParamDto,
  AnalyzeArticleRequestDto,
  SummarizeArticleRequestDto,
  TranslateArticleRequestDto,
} from './dto';
import { AiRateLimitGuard } from './guards/ai-rate-limit.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard, AiRateLimitGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly usageService: AiUsageService,
  ) {}

  @Get('usage')
  @UseGuards(JwtAuthGuard)
  getUsage() {
    return this.usageService.getStats();
  }

  @Post('articles/:articleId/summarize')
  @HttpCode(HttpStatus.OK)
  summarize(
    @Param() params: AiArticleParamDto,
    @Body() dto: SummarizeArticleRequestDto,
  ) {
    return this.aiService.summarize(params.articleId, dto);
  }

  @Post('articles/:articleId/translate')
  @HttpCode(HttpStatus.OK)
  translate(
    @Param() params: AiArticleParamDto,
    @Body() dto: TranslateArticleRequestDto,
  ) {
    return this.aiService.translate(params.articleId, dto);
  }

  @Post('articles/:articleId/analyze')
  @HttpCode(HttpStatus.OK)
  analyze(
    @Param() params: AiArticleParamDto,
    @Body() dto: AnalyzeArticleRequestDto,
  ) {
    return this.aiService.analyze(params.articleId, dto);
  }
}
