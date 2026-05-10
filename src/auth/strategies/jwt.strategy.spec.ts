import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UserRole } from 'src/common/enums';

describe('JwtStrategy', () => {
  const configServiceMock = {
    getOrThrow: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    configServiceMock.getOrThrow.mockReturnValue('access-secret');
  });

  it('reads JWT secret from config on construction', () => {
    const strategy = new JwtStrategy(
      configServiceMock as unknown as ConfigService,
    );

    expect(strategy).toBeDefined();
    expect(configServiceMock.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
  });

  it('returns payload as is in validate()', () => {
    const strategy = new JwtStrategy(
      configServiceMock as unknown as ConfigService,
    );
    const payload = {
      userId: 'user-1',
      login: 'john',
      role: UserRole.ADMIN,
    };

    const result = strategy.validate(payload);

    expect(result).toEqual(payload);
  });
});
