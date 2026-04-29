import { GeminiService } from './gemini.service';
import { AppLoggerService } from 'src/common/logger/app-logger.service';
import { GeminiUnavailableError } from './errors/gemini-unavailable.error';
import { GeminiAuthError } from './errors/gemini-auth.error';

const makeResponse = (status: number, data: object) => ({
  ok: status >= 200 && status < 300,
  status,
  json: vi.fn().mockResolvedValue(data),
});

const makeGeminiResponse = (text: string) => ({
  candidates: [{ content: { parts: [{ text }] } }],
  usageMetadata: {
    promptTokenCount: 10,
    candidatesTokenCount: 5,
    totalTokenCount: 15,
  },
});

const makeService = (overrides: Record<string, unknown> = {}) => {
  const config = {
    get: vi.fn((key: string) => {
      const defaults: Record<string, unknown> = {
        GEMINI_API_KEY: 'test-key',
        GEMINI_API_BASE_URL: 'https://api.gemini.test',
        GEMINI_MODEL: 'gemini-test',
        AI_HTTP_TIMEOUT_MS: 5000,
        AI_RETRY_COUNT: 2,
        AI_RETRY_BASE_DELAY_MS: 1,
        ...overrides,
      };
      return defaults[key];
    }),
  } as any;

  const logger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as AppLoggerService;

  return new GeminiService(config, logger);
};

describe('GeminiService', () => {
  let service: GeminiService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    service = makeService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns text and token usage on success', async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse(200, makeGeminiResponse('Generated text')),
    );

    const result = await service.generateContent('test prompt');

    expect(result.text).toBe('Generated text');
    expect(result.tokenUsage).toEqual({ prompt: 10, completion: 5, total: 15 });
  });

  it('returns empty text when candidates list is empty', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, { candidates: [] }));

    const result = await service.generateContent('prompt');
    expect(result.text).toBe('');
    expect(result.tokenUsage).toBeUndefined();
  });

  it('throws GeminiAuthError on 401', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(401, {}));

    await expect(service.generateContent('prompt')).rejects.toBeInstanceOf(
      GeminiAuthError,
    );
  });

  it('throws GeminiAuthError on 403', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(403, {}));

    await expect(service.generateContent('prompt')).rejects.toBeInstanceOf(
      GeminiAuthError,
    );
  });

  it('retries on 429 and throws GeminiUnavailableError after exhaustion', async () => {
    fetchMock.mockResolvedValue(makeResponse(429, {}));

    await expect(service.generateContent('prompt')).rejects.toBeInstanceOf(
      GeminiUnavailableError,
    );
    // initial attempt + 2 retries = 3 calls
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries on 500 and throws GeminiUnavailableError after exhaustion', async () => {
    fetchMock.mockResolvedValue(makeResponse(500, {}));

    await expect(service.generateContent('prompt')).rejects.toBeInstanceOf(
      GeminiUnavailableError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('succeeds on second attempt after 500', async () => {
    fetchMock
      .mockResolvedValueOnce(makeResponse(500, {}))
      .mockResolvedValueOnce(makeResponse(200, makeGeminiResponse('ok')));

    const result = await service.generateContent('prompt');
    expect(result.text).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws GeminiUnavailableError on AbortError (timeout)', async () => {
    const abortError = new DOMException(
      'The operation was aborted.',
      'AbortError',
    );
    fetchMock.mockRejectedValue(abortError);

    await expect(service.generateContent('prompt')).rejects.toBeInstanceOf(
      GeminiUnavailableError,
    );
  });

  it('throws GeminiUnavailableError on unexpected status', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(418, {}));

    await expect(service.generateContent('prompt')).rejects.toBeInstanceOf(
      GeminiUnavailableError,
    );
  });
});
