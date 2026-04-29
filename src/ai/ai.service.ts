import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArticleService } from 'src/article/article.service';
import { GeminiService } from './gemini.service';
import { AiUsageService } from './ai-usage.service';
import {
  buildSummarizeArticlePrompt,
  buildTranslateArticlePrompt,
  buildAnalyzeArticlePrompt,
} from './prompts/article.prompts';
import {
  AnalyzeArticleRequestDto,
  SummarizeArticleRequestDto,
  TranslateArticleRequestDto,
} from './dto';
import {
  AnalyzeArticleResponse,
  AnalyzeArticleSeverity,
  SummarizeArticleResponse,
  TranslateArticleResponse,
} from './types/ai-response.types';

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

@Injectable()
export class AiService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs: number;

  constructor(
    private readonly articleService: ArticleService,
    private readonly gemini: GeminiService,
    private readonly usage: AiUsageService,
    private readonly config: ConfigService,
  ) {
    const ttlSec = this.config.get<number>('AI_CACHE_TTL_SEC') ?? 300;
    this.cacheTtlMs = ttlSec * 1000;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  private setCache(key: string, value: unknown): void {
    this.cache.set(key, { value, expiresAt: Date.now() + this.cacheTtlMs });
  }

  async summarize(
    articleId: string,
    dto: SummarizeArticleRequestDto,
  ): Promise<SummarizeArticleResponse> {
    const maxLength = dto.maxLength ?? 'medium';
    const article = await this.articleService.findOne(articleId);

    const cacheKey = `summarize:${articleId}:${maxLength}:${article.updatedAt}`;
    const cached = this.getFromCache<SummarizeArticleResponse>(cacheKey);
    if (cached) {
      this.usage.record('summarize');
      return cached;
    }

    const prompt = buildSummarizeArticlePrompt(
      article.title,
      article.content,
      maxLength,
    );
    const { text, tokenUsage } = await this.gemini.generateContent(prompt);

    const summary = text.trim();
    const result: SummarizeArticleResponse = {
      articleId,
      summary,
      originalLength: article.content.length,
      summaryLength: summary.length,
    };

    this.setCache(cacheKey, result);
    this.usage.record('summarize', tokenUsage);
    return result;
  }

  async translate(
    articleId: string,
    dto: TranslateArticleRequestDto,
  ): Promise<TranslateArticleResponse> {
    const article = await this.articleService.findOne(articleId);

    const cacheKey = `translate:${articleId}:${dto.targetLanguage}:${dto.sourceLanguage ?? ''}:${article.updatedAt}`;
    const cached = this.getFromCache<TranslateArticleResponse>(cacheKey);
    if (cached) {
      this.usage.record('translate');
      return cached;
    }

    const prompt = buildTranslateArticlePrompt(
      article.title,
      article.content,
      dto.targetLanguage,
      dto.sourceLanguage,
    );
    const { text, tokenUsage } = await this.gemini.generateContent(prompt);

    const result: TranslateArticleResponse = {
      articleId,
      translatedText: text.trim(),
      detectedLanguage: dto.sourceLanguage ?? 'auto',
    };

    this.setCache(cacheKey, result);
    this.usage.record('translate', tokenUsage);
    return result;
  }

  async analyze(
    articleId: string,
    dto: AnalyzeArticleRequestDto,
  ): Promise<AnalyzeArticleResponse> {
    const task = dto.task ?? 'review';
    const article = await this.articleService.findOne(articleId);

    const prompt = buildAnalyzeArticlePrompt(
      article.title,
      article.content,
      task,
    );
    const { text, tokenUsage } = await this.gemini.generateContent(prompt);

    const result = this.parseAnalyzeResponse(articleId, text);
    this.usage.record('analyze', tokenUsage);
    return result;
  }

  private parseAnalyzeResponse(
    articleId: string,
    raw: string,
  ): AnalyzeArticleResponse {
    const severityMatch = raw.match(/^SEVERITY:\s*(info|warning|error)/im);
    const severity: AnalyzeArticleSeverity =
      (severityMatch?.[1]?.toLowerCase() as AnalyzeArticleSeverity) ?? 'info';

    const suggestionsSection = raw.match(
      /^SUGGESTIONS:\s*\n([\s\S]*?)(?=\n[A-Z]+:|$)/im,
    );
    const suggestions = suggestionsSection
      ? suggestionsSection[1]
          .split('\n')
          .map((l) => l.replace(/^[-*•]\s*/, '').trim())
          .filter(Boolean)
      : [];

    const analysisSection = raw.match(/^ANALYSIS:\s*\n([\s\S]*?)(?=\n[A-Z]+:)/im);
    const analysis = analysisSection
      ? analysisSection[1].trim()
      : raw.trim();

    return { articleId, analysis, suggestions, severity };
  }
}
