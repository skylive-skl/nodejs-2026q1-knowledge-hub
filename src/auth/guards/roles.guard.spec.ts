import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from 'src/common/enums';
import { ForbiddenError } from 'src/common/errors/forbidden.error';

describe('RolesGuard', () => {
  const reflectorMock = {
    getAllAndOverride: vi.fn(),
  };

  let guard: RolesGuard;

  const makeContext = (user?: { role: UserRole }): ExecutionContext =>
    ({
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new RolesGuard(reflectorMock as unknown as Reflector);
  });

  it('allows access when @Roles metadata is missing', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(undefined);

    const result = guard.canActivate(makeContext({ role: UserRole.VIEWER }));

    expect(result).toBe(true);
  });

  it('throws ForbiddenError when user is missing in request', () => {
    reflectorMock.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(() => guard.canActivate(makeContext())).toThrow(ForbiddenError);
  });

  it('throws ForbiddenError when user role is insufficient', () => {
    reflectorMock.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(() =>
      guard.canActivate(makeContext({ role: UserRole.VIEWER })),
    ).toThrow(ForbiddenError);
  });

  it('allows access when user role is included in required roles', () => {
    reflectorMock.getAllAndOverride.mockReturnValue([
      UserRole.ADMIN,
      UserRole.EDITOR,
    ]);

    const result = guard.canActivate(makeContext({ role: UserRole.EDITOR }));

    expect(result).toBe(true);
  });
});
