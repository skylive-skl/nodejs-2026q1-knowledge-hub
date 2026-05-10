import { ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthThrottlerGuard } from './auth-throttler.guard';

describe('AuthThrottlerGuard', () => {
  const context = {} as ExecutionContext;

  let originalDisableFlag: string | undefined;

  beforeEach(() => {
    originalDisableFlag = process.env.DISABLE_THROTTLE_FOR_TESTS;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalDisableFlag === undefined) {
      delete process.env.DISABLE_THROTTLE_FOR_TESTS;
    } else {
      process.env.DISABLE_THROTTLE_FOR_TESTS = originalDisableFlag;
    }
  });

  it('returns true when throttle is disabled for tests', async () => {
    process.env.DISABLE_THROTTLE_FOR_TESTS = 'true';

    const guard = Object.create(
      AuthThrottlerGuard.prototype,
    ) as AuthThrottlerGuard;

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('delegates to ThrottlerGuard.canActivate when throttle is enabled', async () => {
    process.env.DISABLE_THROTTLE_FOR_TESTS = 'false';
    const parentSpy = vi
      .spyOn(ThrottlerGuard.prototype, 'canActivate')
      .mockResolvedValue(true);

    const guard = Object.create(
      AuthThrottlerGuard.prototype,
    ) as AuthThrottlerGuard;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(parentSpy).toHaveBeenCalledWith(context);
  });
});
