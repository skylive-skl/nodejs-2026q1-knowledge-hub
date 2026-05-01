type RawEnv = Record<string, unknown>;

const requireNonEmptyString = (env: RawEnv, key: string): string => {
  const value = env[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value.trim();
};

const parsePositiveInt = (
  env: RawEnv,
  key: string,
  fallback: number,
): number => {
  const raw = env[key];
  const value =
    raw === undefined || raw === null || raw === ''
      ? fallback
      : Number.parseInt(String(raw), 10);

  if (!Number.isFinite(value) || Number.isNaN(value) || value <= 0) {
    throw new Error(`Environment variable ${key} must be a positive integer`);
  }

  return value;
};

export const validateEnvironment = (env: RawEnv): RawEnv => {
  const validated: RawEnv = { ...env };

  validated.GEMINI_API_KEY = requireNonEmptyString(env, 'GEMINI_API_KEY');
  validated.GEMINI_API_BASE_URL = requireNonEmptyString(
    env,
    'GEMINI_API_BASE_URL',
  );
  validated.GEMINI_MODEL = requireNonEmptyString(env, 'GEMINI_MODEL');

  validated.AI_RATE_LIMIT_RPM = parsePositiveInt(env, 'AI_RATE_LIMIT_RPM', 20);
  validated.AI_CACHE_TTL_SEC = parsePositiveInt(env, 'AI_CACHE_TTL_SEC', 300);
  validated.AI_HTTP_TIMEOUT_MS = parsePositiveInt(
    env,
    'AI_HTTP_TIMEOUT_MS',
    15000,
  );
  validated.AI_RETRY_COUNT = parsePositiveInt(env, 'AI_RETRY_COUNT', 3);
  validated.AI_RETRY_BASE_DELAY_MS = parsePositiveInt(
    env,
    'AI_RETRY_BASE_DELAY_MS',
    300,
  );

  return validated;
};
