import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArticleService } from 'src/article/article.service';
import { GeminiService, GeminiContent } from './gemini.service';
import { AiUsageService, TokenUsage } from './ai-usage.service';
import { AiSessionService } from './ai-session.service';
import { TtlCache } from './ttl-cache';
import {
  buildSummarizeArticlePrompt,
  buildTranslateArticlePrompt,
  buildAnalyzeArticlePrompt,
} from './prompts/article.prompts';
import {
  AnalyzeArticleRequestDto,
  GenerateRequestDto,
  SummarizeArticleRequestDto,
  TranslateArticleRequestDto,
} from './dto';
import {
  AnalyzeArticleResponse,
  AnalyzeArticleSeverity,
  SummarizeArticleResponse,
  TranslateArticleResponse,
} from './types/ai-response.types';

type AnalyzeJsonResult = {
  analysis: string;
  suggestions: string[];
  severity: AnalyzeArticleSeverity;
};

type TranslateJsonResult = {
  translatedTitle: string;
  translatedContent: string;
};

const ANALYZE_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    analysis: { type: 'string' },
    suggestions: { type: 'array', items: { type: 'string' } },
    severity: { type: 'string', enum: ['info', 'warning', 'error'] },
  },
  required: ['analysis', 'suggestions', 'severity'],
} as const;

const TRANSLATE_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    translatedTitle: { type: 'string' },
    translatedContent: { type: 'string' },
  },
  required: ['translatedTitle', 'translatedContent'],
} as const;

@Injectable()
export class AiService {
  private readonly cache: TtlCache<unknown>;

  constructor(
    private readonly articleService: ArticleService,
    private readonly gemini: GeminiService,
    private readonly usage: AiUsageService,
    private readonly config: ConfigService,
    private readonly sessions: AiSessionService,
  ) {
    const ttlSec = this.config.get<number>('AI_CACHE_TTL_SEC') ?? 300;
    this.cache = new TtlCache<unknown>(ttlSec * 1000);
  }

  async summarize(
    articleId: string,
    dto: SummarizeArticleRequestDto,
  ): Promise<SummarizeArticleResponse> {
    const maxLength = dto.maxLength ?? 'medium';
    const article = await this.articleService.findOne(articleId);

    const cacheKey = `summarize:${articleId}:${maxLength}:${article.updatedAt}`;
    const cached = this.cache.get(cacheKey) as SummarizeArticleResponse | null;
    if (cached) {
      this.usage.record('summarize', { cacheHit: true });
      return cached;
    }

    const prompt = buildSummarizeArticlePrompt(
      article.title,
      article.content,
      maxLength,
    );
    const start = Date.now();
    const { text, tokenUsage } = await this.gemini.generateContent(prompt);
    const latencyMs = Date.now() - start;

    const summary = text.trim();
    const result: SummarizeArticleResponse = {
      articleId,
      summary,
      originalLength: article.content.length,
      summaryLength: summary.length,
    };

    this.cache.set(cacheKey, result);
    this.usage.record('summarize', { tokens: tokenUsage, latencyMs });
    return result;
  }

  async translate(
    articleId: string,
    dto: TranslateArticleRequestDto,
  ): Promise<TranslateArticleResponse> {
    const article = await this.articleService.findOne(articleId);

    const cacheKey = `translate:${articleId}:${dto.targetLanguage}:${dto.sourceLanguage ?? ''}:${article.updatedAt}`;
    const cached = this.cache.get(cacheKey) as TranslateArticleResponse | null;
    if (cached) {
      this.usage.record('translate', { cacheHit: true });
      return cached;
    }

    const prompt = buildTranslateArticlePrompt(
      article.title,
      article.content,
      dto.targetLanguage,
      dto.sourceLanguage,
    );
    const start = Date.now();
    const { data, tokenUsage } =
      await this.gemini.generateJson<TranslateJsonResult>(
        prompt,
        TRANSLATE_RESPONSE_SCHEMA,
      );
    const latencyMs = Date.now() - start;

    const result: TranslateArticleResponse = {
      articleId,
      translatedTitle: data.translatedTitle.trim(),
      translatedContent: data.translatedContent.trim(),
      detectedLanguage: dto.sourceLanguage ?? 'auto',
    };

    this.cache.set(cacheKey, result);
    this.usage.record('translate', { tokens: tokenUsage, latencyMs });
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
    const start = Date.now();
    const { data, tokenUsage } =
      await this.gemini.generateJson<AnalyzeJsonResult>(
        prompt,
        ANALYZE_RESPONSE_SCHEMA,
      );
    const latencyMs = Date.now() - start;

    const result: AnalyzeArticleResponse = {
      articleId,
      analysis: data.analysis,
      suggestions: data.suggestions,
      severity: data.severity ?? 'info',
    };
    this.usage.record('analyze', { tokens: tokenUsage, latencyMs });
    return result;
  }

  async generate(dto: GenerateRequestDto): Promise<{ text: string }> {
    const start = Date.now();

    let result: { text: string; tokenUsage?: TokenUsage };

    if (dto.sessionId) {
      const history = this.sessions.getSession(dto.sessionId);
      const contents: GeminiContent[] = [
        ...history,
        { role: 'user', parts: [{ text: dto.prompt }] },
      ];
      result = await this.gemini.generateWithHistory(contents);
      this.sessions.setSession(dto.sessionId, [
        ...contents,
        { role: 'model', parts: [{ text: result.text.trim() }] },
      ]);
    } else {
      result = await this.gemini.generateContent(dto.prompt);
    }

    const latencyMs = Date.now() - start;
    this.usage.record('generate', { tokens: result.tokenUsage, latencyMs });
    return { text: result.text.trim() };
  }
}
