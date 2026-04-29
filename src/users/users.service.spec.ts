import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserRole } from 'src/common/enums';
import { ForbiddenError } from 'src/common/errors/forbidden.error';
import { NotFoundError } from 'src/common/errors/not-found.error';

vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;

  const prismaServiceMock = {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  const configServiceMock = {
    get: vi.fn(),
  };

  const makeDbUser = (overrides: Partial<any> = {}) => ({
    id: 'user-1',
    login: 'john',
    password: 'hashed-password',
    role: UserRole.VIEWER,
    createdAt: BigInt(1000),
    updatedAt: BigInt(2000),
    ...overrides,
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    configServiceMock.get.mockReturnValue('10');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: UsersService,
          useFactory: (
            prismaService: PrismaService,
            appConfigService: ConfigService,
          ) => new UsersService(prismaService, appConfigService),
          inject: [PrismaService, ConfigService],
        },
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns normalized users sorted by login desc', async () => {
      prismaServiceMock.user.findMany.mockResolvedValue([
        makeDbUser({ id: 'u-1', login: 'alice' }),
        makeDbUser({ id: 'u-2', login: 'charlie' }),
        makeDbUser({ id: 'u-3', login: 'bob' }),
      ]);

      const result = await service.findAll({ sortBy: 'login', order: 'desc' });

      expect(Array.isArray(result)).toBe(true);
      expect(result.map((user) => user.login)).toEqual([
        'charlie',
        'bob',
        'alice',
      ]);
      expect(result[0].createdAt).toBeTypeOf('number');
      expect(result[0].updatedAt).toBeTypeOf('number');
    });

    it('returns paginated response when page or limit exists', async () => {
      prismaServiceMock.user.findMany.mockResolvedValue([
        makeDbUser({ id: 'u-1', login: 'alice' }),
        makeDbUser({ id: 'u-2', login: 'bob' }),
        makeDbUser({ id: 'u-3', login: 'charlie' }),
      ]);

      const result = await service.findAll({ page: 2, limit: 1 });

      expect(result.total).toBe(3);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].login).toBe('bob');
    });
  });

  describe('findOne', () => {
    it('returns user when found', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue(makeDbUser());

      const result = await service.findOne('user-1');

      expect(prismaServiceMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(result?.id).toBe('user-1');
      expect(result?.createdAt).toBe(1000);
      expect(result?.updatedAt).toBe(2000);
    });

    it('throws NotFoundError when user does not exist', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe('create', () => {
    it('hashes password and assigns default viewer role', async () => {
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-by-bcrypt' as never);

      prismaServiceMock.user.create.mockImplementation(async ({ data }) =>
        makeDbUser({
          id: 'created-id',
          login: data.login,
          password: data.password,
          role: data.role,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        }),
      );

      const result = await service.create({
        login: 'new-user',
        password: 'plain-pass',
      } as any);

      expect(bcrypt.hash).toHaveBeenCalledWith('plain-pass', 10);

      const createCall = prismaServiceMock.user.create.mock.calls[0][0];
      expect(createCall.data.role).toBe(UserRole.VIEWER);
      expect(createCall.data.password).toBe('hashed-by-bcrypt');
      expect(typeof createCall.data.createdAt).toBe('bigint');
      expect(typeof createCall.data.updatedAt).toBe('bigint');
      expect(result.role).toBe(UserRole.VIEWER);
      expect(result.password).toBe('hashed-by-bcrypt');
    });

    it('uses provided role when it is passed in dto', async () => {
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-by-bcrypt' as never);
      prismaServiceMock.user.create.mockImplementation(async ({ data }) =>
        makeDbUser({
          login: data.login,
          password: data.password,
          role: data.role,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        }),
      );

      const result = await service.create({
        login: 'editor-user',
        password: 'plain-pass',
        role: UserRole.EDITOR,
      } as any);

      expect(prismaServiceMock.user.create.mock.calls[0][0].data.role).toBe(
        UserRole.EDITOR,
      );
      expect(result.role).toBe(UserRole.EDITOR);
    });
  });

  describe('updatePassword', () => {
    it('throws NotFoundError when user is missing', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePassword('missing-id', {
          oldPassword: 'old',
          newPassword: 'new',
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws ForbiddenError when old password does not match', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue(makeDbUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        service.updatePassword('user-1', {
          oldPassword: 'wrong',
          newPassword: 'new-pass',
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('throws ForbiddenError when new password equals old password', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue(makeDbUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      await expect(
        service.updatePassword('user-1', {
          oldPassword: 'same-pass',
          newPassword: 'same-pass',
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('updates password when old password is correct', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue(makeDbUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(bcrypt.hash).mockResolvedValue('new-hash' as never);
      prismaServiceMock.user.update.mockResolvedValue(
        makeDbUser({ password: 'new-hash', updatedAt: BigInt(3000) }),
      );

      const result = await service.updatePassword('user-1', {
        oldPassword: 'old-pass',
        newPassword: 'new-pass',
      });

      expect(prismaServiceMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          password: 'new-hash',
          updatedAt: expect.any(BigInt),
        },
      });
      expect(result?.password).toBe('new-hash');
      expect(result?.updatedAt).toBe(3000);
    });
  });

  describe('updateRole', () => {
    it('throws NotFoundError when user does not exist', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateRole('missing-id', { role: UserRole.ADMIN }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('updates role when user exists', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue(makeDbUser());
      prismaServiceMock.user.update.mockResolvedValue(
        makeDbUser({ role: UserRole.ADMIN, updatedAt: BigInt(4000) }),
      );

      const result = await service.updateRole('user-1', {
        role: UserRole.ADMIN,
      });

      expect(prismaServiceMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          role: UserRole.ADMIN,
          updatedAt: expect.any(BigInt),
        },
      });
      expect(result?.role).toBe(UserRole.ADMIN);
      expect(result?.updatedAt).toBe(4000);
    });
  });

  describe('remove', () => {
    it('throws NotFoundError when user does not exist', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing-id')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it('deletes user and returns true when user exists', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue(makeDbUser());
      prismaServiceMock.user.delete.mockResolvedValue(makeDbUser());

      const result = await service.remove('user-1');

      expect(prismaServiceMock.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(result).toBe(true);
    });
  });
});
