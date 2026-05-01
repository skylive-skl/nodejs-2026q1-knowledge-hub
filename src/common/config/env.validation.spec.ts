import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './env.validation';

const baseEnv = {
  GEMINI_API_KEY: 'test-key',
  GEMINI_API_BASE_URL: 'https://generativelanguage.googleapis.com',
  GEMINI_MODEL: 'gemini-2.0-flash',
  AI_RATE_LIMIT_RPM: '20',
  AI_CACHE_TTL_SEC: '300',
  AI_HTTP_TIMEOUT_MS: '15000',
  AI_RETRY_COUNT: '3',
  AI_RETRY_BASE_DELAY_MS: '300',
};

describe('validateEnvironment', () => {
  it('coerces numeric AI values to numbers', () => {
    const validated = validateEnvironment(baseEnv);

    expect(validated.AI_RATE_LIMIT_RPM).toBe(20);
    expect(validated.AI_CACHE_TTL_SEC).toBe(300);
    expect(validated.AI_HTTP_TIMEOUT_MS).toBe(15000);
    expect(validated.AI_RETRY_COUNT).toBe(3);
    expect(validated.AI_RETRY_BASE_DELAY_MS).toBe(300);
  });

  it('throws when GEMINI_API_KEY is missing', () => {
    const env = { ...baseEnv, GEMINI_API_KEY: '' };

    expect(() => validateEnvironment(env)).toThrow(
      'Missing required environment variable: GEMINI_API_KEY',
    );
  });

  it('throws when numeric value is invalid', () => {
    const env = { ...baseEnv, AI_RETRY_COUNT: 'abc' };

    expect(() => validateEnvironment(env)).toThrow(
      'Environment variable AI_RETRY_COUNT must be a positive integer',
    );
  });
});
