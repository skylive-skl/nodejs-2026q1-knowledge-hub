import { AiRateLimitGuard } from './ai-rate-limit.guard';
import { ExecutionContext, HttpStatus } from '@nestjs/common';

const makeContext = (ip = '127.0.0.1') => {
  const mockResponse = { setHeader: vi.fn() };
  return {
    switchToHttp: () => ({
      getRequest: () => ({ ip }),
      getResponse: () => mockResponse,
    }),
  } as unknown as ExecutionContext;
};

const makeGuard = (rpm = 3) => {
  const config = { get: vi.fn().mockReturnValue(rpm) } as any;
  return new AiRateLimitGuard(config);
};

describe('AiRateLimitGuard', () => {
  let guard: AiRateLimitGuard;
  const originalEnv = process.env.DISABLE_THROTTLE_FOR_TESTS;

  beforeEach(() => {
    delete process.env.DISABLE_THROTTLE_FOR_TESTS;
    guard = makeGuard(3);
  });

  afterEach(() => {
    process.env.DISABLE_THROTTLE_FOR_TESTS = originalEnv;
  });

  it('allows requests within the limit', () => {
    const ctx = makeContext();
    expect(guard.canActivate(ctx)).toBe(true);
    expect(guard.canActivate(ctx)).toBe(true);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws 429 when limit is exceeded', () => {
    const ctx = makeContext('1.2.3.4');
    guard.canActivate(ctx);
    guard.canActivate(ctx);
    guard.canActivate(ctx);

    expect(() => guard.canActivate(ctx)).toThrow(
      expect.objectContaining({ status: HttpStatus.TOO_MANY_REQUESTS }),
    );
  });

  it('sets Retry-After header when limit is exceeded', () => {
    const ctx = makeContext('2.3.4.5');
    const http = ctx.switchToHttp();
    const response = http.getResponse() as { setHeader: ReturnType<typeof vi.fn> };

    guard.canActivate(ctx);
    guard.canActivate(ctx);
    guard.canActivate(ctx);

    try {
      guard.canActivate(ctx);
    } catch (_) {
      // expected 429
    }

    expect(response.setHeader).toHaveBeenCalledWith(
      'Retry-After',
      expect.any(String),
    );
  });

  it('bypasses throttle when DISABLE_THROTTLE_FOR_TESTS=true', () => {
    process.env.DISABLE_THROTTLE_FOR_TESTS = 'true';

    const ctx = makeContext('3.4.5.6');
    for (let i = 0; i < 10; i++) {
      expect(guard.canActivate(ctx)).toBe(true);
    }
  });
});
