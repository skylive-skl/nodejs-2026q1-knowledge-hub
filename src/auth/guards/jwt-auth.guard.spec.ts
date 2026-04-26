import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('returns user when token is valid', () => {
    const user = { userId: 'user-1' };

    const result = (guard as any).handleRequest(null, user, null, null, null);

    expect(result).toEqual(user);
  });

  it('throws UnauthorizedException when token is missing', () => {
    expect(() =>
      (guard as any).handleRequest(null, null, new Error('No auth token')),
    ).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when token is malformed', () => {
    expect(() =>
      (guard as any).handleRequest(null, null, new Error('jwt malformed')),
    ).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when token is expired', () => {
    expect(() =>
      (guard as any).handleRequest(null, null, new Error('jwt expired')),
    ).toThrow(UnauthorizedException);
  });
});
