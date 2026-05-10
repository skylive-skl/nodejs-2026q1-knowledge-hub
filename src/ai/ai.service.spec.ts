import { AiService } from './ai.service';
import { GeminiService } from './gemini.service';
import { AiUsageService } from './ai-usage.service';
import { AiSessionService } from './ai-session.service';
import { ArticleService } from 'src/article/article.service';
import { NotFoundError } from 'src/common/errors/not-found.error';
import { ArticleStatus } from 'src/common/enums';
import { Article } from 'src/common/interfaces';

const makeArticle = (overrides: Partial<Article> = {}): Article => ({
  id: 'article-uuid-1',
  title: 'Test Article',
  content: 'This is the article content for testing.',
  status: ArticleStatus.PUBLISHED,
  authorId: 'author-1',
  categoryId: null,
  tags: [],
  createdAt: 1000,
  updatedAt: 2000,
  ...overrides,
});

describe('AiService', () => {
  let service: AiService;
  let geminiMock: {
    generateContent: ReturnType<typeof vi.fn>;
    generateJson: ReturnType<typeof vi.fn>;
  };
  let articleServiceMock: { findOne: ReturnType<typeof vi.fn> };
  let usageMock: {
    record: ReturnType<typeof vi.fn>;
    getStats: ReturnType<typeof vi.fn>;
  };
  let sessionMock: {
    getSession: ReturnType<typeof vi.fn>;
    setSession: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    geminiMock = { generateContent: vi.fn(), generateJson: vi.fn() };
    articleServiceMock = { findOne: vi.fn() };
    usageMock = { record: vi.fn(), getStats: vi.fn() };
    sessionMock = {
      getSession: vi.fn().mockReturnValue([]),
      setSession: vi.fn(),
    };

    const config = { get: vi.fn().mockReturnValue(300) } as any;

    service = new AiService(
      articleServiceMock as unknown as ArticleService,
      geminiMock as unknown as GeminiService,
      usageMock as unknown as AiUsageService,
      config,
      sessionMock as unknown as AiSessionService,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── summarize ───────────────────────────────────────────────────────────

  describe('summarize', () => {
    it('returns summary response with correct shape', async () => {
      articleServiceMock.findOne.mockResolvedValue(makeArticle());
      geminiMock.generateContent.mockResolvedValue({ text: 'Short summary.' });

      const result = await service.summarize('article-uuid-1', {});

      expect(result.articleId).toBe('article-uuid-1');
      expect(result.summary).toBe('Short summary.');
      expect(result.originalLength).toBe(makeArticle().content.length);
      expect(result.summaryLength).toBe('Short summary.'.length);
    });

    it('defaults maxLength to medium when not provided', async () => {
      articleServiceMock.findOne.mockResolvedValue(makeArticle());
      geminiMock.generateContent.mockResolvedValue({ text: 'summary' });

      await service.summarize('article-uuid-1', {});

      const calledPrompt: string = geminiMock.generateContent.mock.calls[0][0];
      expect(calledPrompt).toContain('medium');
    });

    it('returns cached result on second call with same params and updatedAt', async () => {
      const article = makeArticle({ updatedAt: 5000 });
      articleServiceMock.findOne.mockResolvedValue(article);
      geminiMock.generateContent.mockResolvedValue({ text: 'cached summary' });

      const first = await service.summarize('article-uuid-1', {});
      const second = await service.summarize('article-uuid-1', {});

      expect(geminiMock.generateContent).toHaveBeenCalledTimes(1);
      expect(first).toEqual(second);
    });

    it('bypasses cache when article updatedAt changes', async () => {
      articleServiceMock.findOne
        .mockResolvedValueOnce(makeArticle({ updatedAt: 1000 }))
        .mockResolvedValueOnce(makeArticle({ updatedAt: 9999 }));
      geminiMock.generateContent.mockResolvedValue({ text: 'v2 summary' });

      await service.summarize('article-uuid-1', {});
      await service.summarize('article-uuid-1', {});

      expect(geminiMock.generateContent).toHaveBeenCalledTimes(2);
    });

    it('records usage per call (including cache hit)', async () => {
      articleServiceMock.findOne.mockResolvedValue(makeArticle());
      geminiMock.generateContent.mockResolvedValue({ text: 'x' });

      await service.summarize('article-uuid-1', {});
      await service.summarize('article-uuid-1', {});

      expect(usageMock.record).toHaveBeenCalledTimes(2);
      expect(usageMock.record).toHaveBeenCalledWith(
        'summarize',
        expect.any(Object),
      );
    });

    it('throws NotFoundError when article does not exist', async () => {
      articleServiceMock.findOne.mockRejectedValue(
        new NotFoundError('Article not found'),
      );

      await expect(service.summarize('missing-id', {})).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  // ─── translate ───────────────────────────────────────────────────────────

  describe('translate', () => {
    it('returns translation response with correct shape', async () => {
      articleServiceMock.findOne.mockResolvedValue(makeArticle());
      geminiMock.generateJson.mockResolvedValue({
        data: {
          translatedTitle: ' Переведенный заголовок ',
          translatedContent: ' Переведенный текст ',
        },
      });

      const result = await service.translate('article-uuid-1', {
        targetLanguage: 'ru',
      });

      expect(result.articleId).toBe('article-uuid-1');
      expect(result.translatedTitle).toBe('Переведенный заголовок');
      expect(result.translatedContent).toBe('Переведенный текст');
      expect(result.detectedLanguage).toBe('auto');
    });

    it('uses sourceLanguage when provided', async () => {
      articleServiceMock.findOne.mockResolvedValue(makeArticle());
      geminiMock.generateJson.mockResolvedValue({
        data: {
          translatedTitle: 'Titel',
          translatedContent: 'Inhalt',
        },
      });

      const result = await service.translate('article-uuid-1', {
        targetLanguage: 'de',
        sourceLanguage: 'en',
      });

      expect(result.detectedLanguage).toBe('en');
    });

    it('returns cached result on second call', async () => {
      articleServiceMock.findOne.mockResolvedValue(makeArticle());
      geminiMock.generateJson.mockResolvedValue({
        data: {
          translatedTitle: 'Titulo',
          translatedContent: 'Contenido',
        },
      });

      await service.translate('article-uuid-1', { targetLanguage: 'es' });
      await service.translate('article-uuid-1', { targetLanguage: 'es' });

      expect(geminiMock.generateJson).toHaveBeenCalledTimes(1);
    });
  });

  // ─── analyze ─────────────────────────────────────────────────────────────

  describe('analyze', () => {
    it('parses structured Gemini response correctly', async () => {
      articleServiceMock.findOne.mockResolvedValue(makeArticle());
      geminiMock.generateJson.mockResolvedValue({
        data: {
          analysis: 'The article is well-written.',
          suggestions: ['Add more examples', 'Improve introduction'],
          severity: 'warning',
        },
        tokenUsage: undefined,
      });

      const result = await service.analyze('article-uuid-1', {});

      expect(result.articleId).toBe('article-uuid-1');
      expect(result.analysis).toContain('well-written');
      expect(result.suggestions).toContain('Add more examples');
      expect(result.severity).toBe('warning');
    });

    it('defaults severity to info when not present in response', async () => {
      articleServiceMock.findOne.mockResolvedValue(makeArticle());
      geminiMock.generateJson.mockResolvedValue({
        data: {
          analysis: 'Some analysis.',
          suggestions: [],
          severity: undefined,
        },
        tokenUsage: undefined,
      });

      const result = await service.analyze('article-uuid-1', {});

      expect(result.severity).toBe('info');
    });

    it('defaults task to review when not provided', async () => {
      articleServiceMock.findOne.mockResolvedValue(makeArticle());
      geminiMock.generateJson.mockResolvedValue({
        data: { analysis: 'ok', suggestions: [], severity: 'info' },
      });

      await service.analyze('article-uuid-1', {});

      const prompt: string = geminiMock.generateJson.mock.calls[0][0];
      expect(prompt).toContain('review');
    });

    it('passes ANALYZE_RESPONSE_SCHEMA as second argument to generateJson', async () => {
      articleServiceMock.findOne.mockResolvedValue(makeArticle());
      geminiMock.generateJson.mockResolvedValue({
        data: { analysis: 'ok', suggestions: [], severity: 'info' },
      });

      await service.analyze('article-uuid-1', {});

      const schema = geminiMock.generateJson.mock.calls[0][1];
      expect(schema).toMatchObject({ type: 'object' });
      expect(schema.required).toContain('severity');
    });

    it('records usage for analyze endpoint', async () => {
      articleServiceMock.findOne.mockResolvedValue(makeArticle());
      geminiMock.generateJson.mockResolvedValue({
        data: { analysis: 'x', suggestions: [], severity: 'info' },
        tokenUsage: undefined,
      });

      await service.analyze('article-uuid-1', {});

      expect(usageMock.record).toHaveBeenCalledWith(
        'analyze',
        expect.any(Object),
      );
    });
  });
});
