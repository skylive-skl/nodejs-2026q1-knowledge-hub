import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CategoryService } from './category.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ArticleService } from 'src/article/article.service';

describe('CategoryService', () => {
  let service: CategoryService;

  const prismaServiceMock = {
    category: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  const articleServiceMock = {};

  const makeCategory = (overrides: Partial<any> = {}) => ({
    id: 'category-1',
    name: 'Backend',
    description: 'Backend category',
    ...overrides,
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CategoryService,
          useFactory: (
            prismaService: PrismaService,
            injectedArticleService: ArticleService,
          ) => new CategoryService(prismaService, injectedArticleService),
          inject: [PrismaService, ArticleService],
        },
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
        {
          provide: ArticleService,
          useValue: articleServiceMock,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates category', async () => {
      prismaServiceMock.category.create.mockResolvedValue(makeCategory());

      const result = await service.create({
        name: 'Backend',
        description: 'Backend category',
      });

      expect(prismaServiceMock.category.create).toHaveBeenCalledWith({
        data: {
          name: 'Backend',
          description: 'Backend category',
        },
      });
      expect(result).toEqual(makeCategory());
    });
  });

  describe('findAll', () => {
    it('returns sorted categories', async () => {
      prismaServiceMock.category.findMany.mockResolvedValue([
        makeCategory({ id: 'c-1', name: 'Zed' }),
        makeCategory({ id: 'c-2', name: 'Alpha' }),
      ]);

      const result = await service.findAll({ sortBy: 'name', order: 'asc' });

      expect(result.map((item) => item.name)).toEqual(['Alpha', 'Zed']);
    });

    it('returns paginated categories', async () => {
      prismaServiceMock.category.findMany.mockResolvedValue([
        makeCategory({ id: 'c-1', name: 'First' }),
        makeCategory({ id: 'c-2', name: 'Second' }),
      ]);

      const result = await service.findAll({ page: 2, limit: 1 });

      expect(result.total).toBe(2);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Second');
    });
  });

  describe('findOne', () => {
    it('returns category when found', async () => {
      prismaServiceMock.category.findUnique.mockResolvedValue(makeCategory());

      const result = await service.findOne('category-1');

      expect(prismaServiceMock.category.findUnique).toHaveBeenCalledWith({
        where: { id: 'category-1' },
      });
      expect(result).toEqual(makeCategory());
    });

    it('throws NotFoundException for missing category', async () => {
      prismaServiceMock.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException when category does not exist', async () => {
      prismaServiceMock.category.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing-id', { name: 'Updated' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates category when it exists', async () => {
      prismaServiceMock.category.findUnique.mockResolvedValue(makeCategory());
      prismaServiceMock.category.update.mockResolvedValue(
        makeCategory({ name: 'Updated' }),
      );

      const result = await service.update('category-1', { name: 'Updated' });

      expect(prismaServiceMock.category.update).toHaveBeenCalledWith({
        where: { id: 'category-1' },
        data: { name: 'Updated' },
      });
      expect(result.name).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when category does not exist', async () => {
      prismaServiceMock.category.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prismaServiceMock.category.delete).not.toHaveBeenCalled();
    });

    it('deletes category when it exists', async () => {
      prismaServiceMock.category.findUnique.mockResolvedValue(makeCategory());
      prismaServiceMock.category.delete.mockResolvedValue(makeCategory());

      await service.remove('category-1');

      expect(prismaServiceMock.category.delete).toHaveBeenCalledWith({
        where: { id: 'category-1' },
      });
    });
  });
});
