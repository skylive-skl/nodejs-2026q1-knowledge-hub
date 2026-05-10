import { GeminiHttpClient } from './gemini-http.client';
import { AppLoggerService } from 'src/common/logger/app-logger.service';
import { GeminiUnavailableError } from './errors/gemini-unavailable.error';
import { GeminiAuthError } from './errors/gemini-auth.error';
import { GeminiRateLimitError } from './errors/gemini-rate-limit.error';

const makeResponse = (
  status: number,
  data: object,
  headers?: Record<string, string>,
) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: {
    get: vi.fn((name: string) => headers?.[name.toLowerCase()] ?? null),
  },
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

const makeClient = (overrides: Record<string, unknown> = {}) => {
  const config = {
    get: vi.fn((key: string) => {
      const defaults: Record<string, unknown> = {
        GEMINI_API_KEY: 'test-key',
        GEMINI_API_BASE_URL: 'https://api.gemini.test',
        GEMINI_MODEL: 'gemini-test',
        AI_HTTP_TIMEOUT_MS: 5000,
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

  return new GeminiHttpClient(config, logger);
};

describe('GeminiHttpClient', () => {
  let client: GeminiHttpClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    client = makeClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(client).toBeDefined();
  });

  it('throws on empty GEMINI_API_KEY', () => {
    expect(() => makeClient({ GEMINI_API_KEY: '' })).toThrow(
      'Missing required environment variable: GEMINI_API_KEY',
    );
  });

  it('returns text and token usage on success', async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse(200, makeGeminiResponse('Generated text')),
    );

    const result = await client.call([
      { role: 'user', parts: [{ text: 'hello' }] },
    ]);

    expect(result.text).toBe('Generated text');
    expect(result.tokenUsage).toEqual({ prompt: 10, completion: 5, total: 15 });
  });

  it('sends API key via x-goog-api-key header and not URL query', async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse(200, makeGeminiResponse('ok')),
    );

    await client.call([{ role: 'user', parts: [{ text: 'hello' }] }]);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://api.gemini.test/v1beta/models/gemini-test:generateContent',
    );
    expect(url).not.toContain('?key=');
    expect((options.headers as Record<string, string>)['x-goog-api-key']).toBe(
      'test-key',
    );
  });

  it('returns empty text when candidates list is empty', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, { candidates: [] }));

    const result = await client.call([
      { role: 'user', parts: [{ text: 'hello' }] },
    ]);
    expect(result.text).toBe('');
    expect(result.tokenUsage).toBeUndefined();
  });

  it('throws GeminiAuthError on 401', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(401, {}));

    await expect(
      client.call([{ role: 'user', parts: [{ text: 'hello' }] }]),
    ).rejects.toBeInstanceOf(GeminiAuthError);
  });

  it('throws GeminiAuthError on 403', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(403, {}));

    await expect(
      client.call([{ role: 'user', parts: [{ text: 'hello' }] }]),
    ).rejects.toBeInstanceOf(GeminiAuthError);
  });

  it('throws GeminiRateLimitError on 429', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(429, {}));

    await expect(
      client.call([{ role: 'user', parts: [{ text: 'hello' }] }]),
    ).rejects.toBeInstanceOf(GeminiRateLimitError);
  });

  it('includes retry hint when 429 has Retry-After header', async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse(429, {}, { 'retry-after': '17' }),
    );

    await expect(
      client.call([{ role: 'user', parts: [{ text: 'hello' }] }]),
    ).rejects.toThrow('Retry after 17s.');
  });

  it('throws GeminiUnavailableError on 500', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(500, {}));

    await expect(
      client.call([{ role: 'user', parts: [{ text: 'hello' }] }]),
    ).rejects.toBeInstanceOf(GeminiUnavailableError);
  });

  it('throws GeminiUnavailableError on unexpected status', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(418, {}));

    await expect(
      client.call([{ role: 'user', parts: [{ text: 'hello' }] }]),
    ).rejects.toBeInstanceOf(GeminiUnavailableError);
  });

  it('throws GeminiUnavailableError on AbortError (timeout)', async () => {
    const abortError = new DOMException(
      'The operation was aborted.',
      'AbortError',
    );
    fetchMock.mockRejectedValueOnce(abortError);

    await expect(
      client.call([{ role: 'user', parts: [{ text: 'hello' }] }]),
    ).rejects.toBeInstanceOf(GeminiUnavailableError);
  });

  it('throws GeminiUnavailableError on network error', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network failure'));

    await expect(
      client.call([{ role: 'user', parts: [{ text: 'hello' }] }]),
    ).rejects.toBeInstanceOf(GeminiUnavailableError);
  });

  it('sends generationConfig when provided', async () => {
    const payload = { key: 'value' };
    fetchMock.mockResolvedValueOnce(
      makeResponse(200, makeGeminiResponse(JSON.stringify(payload))),
    );

    await client.call([{ role: 'user', parts: [{ text: 'hello' }] }], {
      response_mime_type: 'application/json',
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.generationConfig?.response_mime_type).toBe('application/json');
  });

  it('omits generationConfig key when not provided', async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse(200, makeGeminiResponse('ok')),
    );

    await client.call([{ role: 'user', parts: [{ text: 'hello' }] }]);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).not.toHaveProperty('generationConfig');
  });
});
