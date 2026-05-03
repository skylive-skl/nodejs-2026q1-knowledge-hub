import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserRole } from 'src/common/enums';
import { ValidationError } from 'src/common/errors/validation.error';
import { ForbiddenError } from 'src/common/errors/forbidden.error';

vi.mock('bcrypt', () => ({
  compare: vi.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const usersServiceMock = {
    create: vi.fn(),
  };

  const prismaServiceMock = {
    user: {
      findUnique: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  };

  const jwtServiceMock = {
    signAsync: vi.fn(),
    verifyAsync: vi.fn(),
    decode: vi.fn(),
  };

  const configServiceMock = {
    getOrThrow: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    configServiceMock.getOrThrow.mockImplementation((key: string) => {
      if (key === 'JWT_REFRESH_SECRET') {
        return 'refresh-secret';
      }
      if (key === 'JWT_REFRESH_TTL') {
        return '7d';
      }
      throw new Error(`Unexpected config key: ${key}`);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: AuthService,
          useFactory: (
            usersService: UsersService,
            prismaService: PrismaService,
            jwtService: JwtService,
            appConfigService: ConfigService,
          ) =>
            new AuthService(
              usersService,
              prismaService,
              jwtService,
              appConfigService,
            ),
          inject: [UsersService, PrismaService, JwtService, ConfigService],
        },
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('signup', () => {
    it('throws ValidationError for duplicate login', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue({
        id: 'existing-user',
      });

      await expect(
        service.signup({ login: 'john', password: 'secret' }),
      ).rejects.toBeInstanceOf(ValidationError);

      expect(usersServiceMock.create).not.toHaveBeenCalled();
    });

    it('creates user with viewer role for unique login', async () => {
      const created = {
        id: 'user-1',
        login: 'john',
        password: 'hashed',
        role: UserRole.VIEWER,
      };

      prismaServiceMock.user.findUnique.mockResolvedValue(null);
      usersServiceMock.create.mockResolvedValue(created);

      const result = await service.signup({
        login: 'john',
        password: 'secret',
      });

      expect(usersServiceMock.create).toHaveBeenCalledWith({
        login: 'john',
        password: 'secret',
        role: UserRole.VIEWER,
      });
      expect(result).toEqual(created);
    });
  });

  describe('login', () => {
    it('throws ForbiddenError when user is not found', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ login: 'unknown', password: 'secret' }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('throws ForbiddenError for invalid password', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        login: 'john',
        password: 'db-hash',
        role: UserRole.EDITOR,
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        service.login({ login: 'john', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('returns token pair and stores refresh token hash on success', async () => {
      const refreshToken = 'refresh.token';

      prismaServiceMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        login: 'john',
        password: 'db-hash',
        role: UserRole.ADMIN,
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      jwtServiceMock.signAsync
        .mockResolvedValueOnce('access.token')
        .mockResolvedValueOnce(refreshToken);
      jwtServiceMock.decode.mockReturnValue({ exp: 1_700_000_000 });

      const result = await service.login({ login: 'john', password: 'secret' });

      expect(jwtServiceMock.signAsync).toHaveBeenNthCalledWith(1, {
        userId: 'user-1',
        login: 'john',
        role: UserRole.ADMIN,
      });
      expect(jwtServiceMock.signAsync).toHaveBeenNthCalledWith(
        2,
        {
          userId: 'user-1',
          login: 'john',
          role: UserRole.ADMIN,
        },
        {
          secret: 'refresh-secret',
          expiresIn: '7d',
        },
      );

      const expectedHash = createHash('sha256')
        .update(refreshToken)
        .digest('hex');
      expect(prismaServiceMock.refreshToken.create).toHaveBeenCalledWith({
        data: {
          token: expectedHash,
          userId: 'user-1',
          expiresAt: BigInt(1_700_000_000) * BigInt(1000),
        },
      });

      expect(result).toEqual({
        accessToken: 'access.token',
        refreshToken,
      });
    });

    it('stores fallback refresh token expiration when decode has no exp', async () => {
      const refreshToken = 'refresh.no-exp';
      const dateNowSpy = vi
        .spyOn(Date, 'now')
        .mockReturnValue(1_700_000_000_000);

      prismaServiceMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        login: 'john',
        password: 'db-hash',
        role: UserRole.ADMIN,
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      jwtServiceMock.signAsync
        .mockResolvedValueOnce('access.token')
        .mockResolvedValueOnce(refreshToken);
      jwtServiceMock.decode.mockReturnValue({});

      await service.login({ login: 'john', password: 'secret' });

      expect(prismaServiceMock.refreshToken.create).toHaveBeenCalledWith({
        data: {
          token: createHash('sha256').update(refreshToken).digest('hex'),
          userId: 'user-1',
          expiresAt: BigInt(1_700_000_000_000 + 7 * 24 * 60 * 60 * 1000),
        },
      });

      dateNowSpy.mockRestore();
    });
  });

  describe('refresh', () => {
    it('throws ForbiddenError for invalid or expired refresh token', async () => {
      jwtServiceMock.verifyAsync.mockRejectedValue(new Error('invalid token'));

      await expect(service.refresh('bad-token')).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it('throws ForbiddenError when token is not in whitelist', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        userId: 'user-1',
        login: 'john',
        role: UserRole.EDITOR,
      });
      prismaServiceMock.refreshToken.findFirst.mockResolvedValue(null);

      await expect(service.refresh('refresh-token')).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it('throws ForbiddenError when payload user does not exist', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        userId: 'user-1',
        login: 'john',
        role: UserRole.EDITOR,
      });
      prismaServiceMock.refreshToken.findFirst.mockResolvedValue({
        id: 'rt-1',
      });
      prismaServiceMock.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh('refresh-token')).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it('rotates refresh token and returns fresh pair for valid token', async () => {
      const oldRefresh = 'old-refresh-token';
      const newRefresh = 'new-refresh-token';

      jwtServiceMock.verifyAsync.mockResolvedValue({
        userId: 'user-1',
        login: 'john',
        role: UserRole.EDITOR,
      });
      prismaServiceMock.refreshToken.findFirst.mockResolvedValue({
        id: 'rt-1',
      });
      prismaServiceMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        login: 'john',
        role: UserRole.EDITOR,
      });
      prismaServiceMock.refreshToken.delete.mockResolvedValue({ id: 'rt-1' });
      jwtServiceMock.signAsync
        .mockResolvedValueOnce('new-access')
        .mockResolvedValueOnce(newRefresh);
      jwtServiceMock.decode.mockReturnValue({ exp: 1_700_000_123 });

      const result = await service.refresh(oldRefresh);

      expect(prismaServiceMock.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
      });
      expect(prismaServiceMock.refreshToken.create).toHaveBeenCalledWith({
        data: {
          token: createHash('sha256').update(newRefresh).digest('hex'),
          userId: 'user-1',
          expiresAt: BigInt(1_700_000_123) * BigInt(1000),
        },
      });
      expect(result).toEqual({
        accessToken: 'new-access',
        refreshToken: newRefresh,
      });
    });
  });

  describe('logout', () => {
    it('throws ForbiddenError when token does not belong to user', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({ userId: 'other-user' });

      await expect(
        service.logout('user-1', 'refresh-token'),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(prismaServiceMock.refreshToken.deleteMany).not.toHaveBeenCalled();
    });

    it('deletes refresh token hash for valid token ownership', async () => {
      const refreshToken = 'refresh-token';

      jwtServiceMock.verifyAsync.mockResolvedValue({ userId: 'user-1' });
      prismaServiceMock.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.logout('user-1', refreshToken);

      expect(prismaServiceMock.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          token: createHash('sha256').update(refreshToken).digest('hex'),
          userId: 'user-1',
        },
      });
    });
  });
});
