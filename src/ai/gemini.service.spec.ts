import { GeminiService } from './gemini.service';
import { GeminiHttpClient } from './gemini-http.client';
import { AppLoggerService } from 'src/common/logger/app-logger.service';
import { GeminiUnavailableError } from './errors/gemini-unavailable.error';
import { GeminiAuthError } from './errors/gemini-auth.error';
import { GeminiRateLimitError } from './errors/gemini-rate-limit.error';
import { GeminiResult } from './types/gemini.types';

const SUCCESS_RESULT: GeminiResult = {
  text: 'Generated text',
  tokenUsage: { prompt: 10, completion: 5, total: 15 },
};

const makeService = (overrides: Record<string, unknown> = {}) => {
  const config = {
    get: vi.fn((key: string) => {
      const defaults: Record<string, unknown> = {
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

  const httpClient = {
    call: vi.fn(),
    modelName: 'gemini-test',
  } as unknown as GeminiHttpClient;

  return { service: new GeminiService(config, logger, httpClient), httpClient };
};

describe('GeminiService', () => {
  let service: GeminiService;
  let httpClient: { call: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    const result = makeService();
    service = result.service;
    httpClient = result.httpClient as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns result from httpClient on success', async () => {
    httpClient.call.mockResolvedValueOnce(SUCCESS_RESULT);

    const result = await service.generateContent('test prompt');

    expect(result.text).toBe('Generated text');
    expect(result.tokenUsage).toEqual({ prompt: 10, completion: 5, total: 15 });
  });

  it('passes contents to httpClient.call for generateContent', async () => {
    httpClient.call.mockResolvedValueOnce(SUCCESS_RESULT);

    await service.generateContent('hello');

    expect(httpClient.call).toHaveBeenCalledWith(
      [{ role: 'user', parts: [{ text: 'hello' }] }],
      undefined,
    );
  });

  it('passes history to httpClient.call for generateWithHistory', async () => {
    httpClient.call.mockResolvedValueOnce(SUCCESS_RESULT);
    const history = [
      { role: 'user' as const, parts: [{ text: 'hi' }] as [{ text: string }] },
      { role: 'model' as const, parts: [{ text: 'hello' }] as [{ text: string }] },
    ];

    await service.generateWithHistory(history);

    expect(httpClient.call).toHaveBeenCalledWith(history, undefined);
  });

  // ─── Retry behaviour ─────────────────────────────────────────────────────

  it('throws GeminiAuthError immediately without retrying', async () => {
    httpClient.call.mockRejectedValue(new GeminiAuthError());

    await expect(service.generateContent('prompt')).rejects.toBeInstanceOf(
      GeminiAuthError,
    );
    expect(httpClient.call).toHaveBeenCalledTimes(1);
  });

  it('throws GeminiRateLimitError immediately without retrying', async () => {
    httpClient.call.mockRejectedValue(new GeminiRateLimitError());

    await expect(service.generateContent('prompt')).rejects.toBeInstanceOf(
      GeminiRateLimitError,
    );
    expect(httpClient.call).toHaveBeenCalledTimes(1);
  });

  it('retries on GeminiUnavailableError and throws after exhaustion', async () => {
    httpClient.call.mockRejectedValue(new GeminiUnavailableError('upstream'));

    await expect(service.generateContent('prompt')).rejects.toBeInstanceOf(
      GeminiUnavailableError,
    );
    // retryCount=2 means 1 initial + 2 retries = 3 total
    expect(httpClient.call).toHaveBeenCalledTimes(3);
  });

  it('succeeds on second attempt after GeminiUnavailableError', async () => {
    httpClient.call
      .mockRejectedValueOnce(new GeminiUnavailableError('upstream'))
      .mockResolvedValueOnce(SUCCESS_RESULT);

    const result = await service.generateContent('prompt');

    expect(result.text).toBe('Generated text');
    expect(httpClient.call).toHaveBeenCalledTimes(2);
  });

  it('wraps unknown errors in GeminiUnavailableError after exhaustion', async () => {
    httpClient.call.mockRejectedValue(new Error('unexpected'));

    await expect(service.generateContent('prompt')).rejects.toBeInstanceOf(
      GeminiUnavailableError,
    );
  });

  // ─── generateJson ─────────────────────────────────────────────────────────

  describe('generateJson', () => {
    it('returns parsed data and token usage on success', async () => {
      const payload = { analysis: 'ok', suggestions: ['tip'], severity: 'info' };
      httpClient.call.mockResolvedValueOnce({
        text: JSON.stringify(payload),
        tokenUsage: { prompt: 10, completion: 5, total: 15 },
      });

      const result = await service.generateJson<typeof payload>('prompt');

      expect(result.data).toEqual(payload);
      expect(result.tokenUsage).toEqual({ prompt: 10, completion: 5, total: 15 });
    });

    it('passes response_mime_type application/json in generationConfig', async () => {
      httpClient.call.mockResolvedValueOnce({ text: '{}', tokenUsage: undefined });

      await service.generateJson('prompt');

      const generationConfig = httpClient.call.mock.calls[0][1];
      expect(generationConfig?.response_mime_type).toBe('application/json');
    });

    it('passes response_schema when schema is provided', async () => {
      httpClient.call.mockResolvedValueOnce({ text: '{}', tokenUsage: undefined });
      const schema = { type: 'object', properties: { analysis: { type: 'string' } } };

      await service.generateJson('prompt', schema);

      const generationConfig = httpClient.call.mock.calls[0][1];
      expect(generationConfig?.response_schema).toEqual(schema);
    });

    it('throws GeminiUnavailableError when httpClient returns invalid JSON text', async () => {
      httpClient.call.mockResolvedValueOnce({ text: 'not-json', tokenUsage: undefined });

      await expect(service.generateJson('prompt')).rejects.toBeInstanceOf(
        GeminiUnavailableError,
      );
    });

    it('propagates GeminiUnavailableError from httpClient', async () => {
      httpClient.call.mockRejectedValue(new GeminiUnavailableError('upstream'));

      await expect(service.generateJson('prompt')).rejects.toBeInstanceOf(
        GeminiUnavailableError,
      );
    });
  });
});
