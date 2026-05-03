import { Test, TestingModule } from '@nestjs/testing';
import { ArticleService } from './article.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommentService } from 'src/comment/comment.service';
import { ArticleStatus } from 'src/common/enums';
import { NotFoundError } from 'src/common/errors/not-found.error';
import { UnprocessableEntityError } from 'src/common/errors/unprocessable-entity.error';

describe('ArticleService', () => {
  let service: ArticleService;

  const prismaServiceMock = {
    article: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  const commentServiceMock = {};

  const makeDbArticle = (overrides: Partial<any> = {}) => ({
    id: 'article-1',
    title: 'Article title',
    content: 'Article content',
    status: ArticleStatus.DRAFT,
    authorId: null,
    categoryId: null,
    createdAt: BigInt(1000),
    updatedAt: BigInt(2000),
    tags: [{ name: 'nestjs' }],
    ...overrides,
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ArticleService,
          useFactory: (
            prismaService: PrismaService,
            commentService: CommentService,
          ) => new ArticleService(prismaService, commentService),
          inject: [PrismaService, CommentService],
        },
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
        {
          provide: CommentService,
          useValue: commentServiceMock,
        },
      ],
    }).compile();

    service = module.get<ArticleService>(ArticleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates article with default draft status and mapped tags', async () => {
      prismaServiceMock.article.create.mockResolvedValue(
        makeDbArticle({ tags: [{ name: 'nestjs' }, { name: 'testing' }] }),
      );

      const result = await service.create({
        title: 'New article',
        content: 'Body',
        authorId: null,
        categoryId: null,
        tags: ['nestjs', 'testing'],
      } as any);

      expect(prismaServiceMock.article.create).toHaveBeenCalledWith({
        data: {
          title: 'New article',
          content: 'Body',
          authorId: null,
          categoryId: null,
          status: ArticleStatus.DRAFT,
          createdAt: expect.any(BigInt),
          updatedAt: expect.any(BigInt),
          tags: {
            connectOrCreate: [
              {
                where: { name: 'nestjs' },
                create: { name: 'nestjs' },
              },
              {
                where: { name: 'testing' },
                create: { name: 'testing' },
              },
            ],
          },
        },
        include: {
          tags: {
            select: { name: true },
          },
        },
      });

      expect(result.status).toBe(ArticleStatus.DRAFT);
      expect(result.tags).toEqual(['nestjs', 'testing']);
      expect(result.createdAt).toBe(1000);
      expect(result.updatedAt).toBe(2000);
    });

    it('uses provided status', async () => {
      prismaServiceMock.article.create.mockResolvedValue(
        makeDbArticle({ status: ArticleStatus.PUBLISHED }),
      );

      await service.create({
        title: 'Published article',
        content: 'Body',
        authorId: null,
        categoryId: null,
        tags: [],
        status: ArticleStatus.PUBLISHED,
      } as any);

      expect(
        prismaServiceMock.article.create.mock.calls[0][0].data.status,
      ).toBe(ArticleStatus.PUBLISHED);
    });
  });

  describe('findAll', () => {
    it('applies filters and returns sorted data', async () => {
      prismaServiceMock.article.findMany.mockResolvedValue([
        makeDbArticle({ id: 'a-1', title: 'B-title' }),
        makeDbArticle({ id: 'a-2', title: 'A-title' }),
      ]);

      const result = await service.findAll({
        status: ArticleStatus.DRAFT,
        categoryId: '13ef4f88-f887-42a3-b7ea-3a65c4977e24',
        tag: 'nestjs',
        sortBy: 'title',
        order: 'asc',
      });

      expect(prismaServiceMock.article.findMany).toHaveBeenCalledWith({
        where: {
          status: ArticleStatus.DRAFT,
          categoryId: '13ef4f88-f887-42a3-b7ea-3a65c4977e24',
          tags: { some: { name: 'nestjs' } },
        },
        include: {
          tags: {
            select: { name: true },
          },
        },
      });
      expect(result.map((article) => article.title)).toEqual([
        'A-title',
        'B-title',
      ]);
    });

    it('returns paginated result when page and limit are provided', async () => {
      prismaServiceMock.article.findMany.mockResolvedValue([
        makeDbArticle({ id: 'a-1', title: 'Title-1' }),
        makeDbArticle({ id: 'a-2', title: 'Title-2' }),
        makeDbArticle({ id: 'a-3', title: 'Title-3' }),
      ]);

      const result = await service.findAll({ page: 2, limit: 1 });

      expect(result.total).toBe(3);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Title-2');
    });
  });

  describe('findOne', () => {
    it('returns normalized article', async () => {
      prismaServiceMock.article.findUnique.mockResolvedValue(
        makeDbArticle({ tags: [{ name: 'nodejs' }, { name: 'nestjs' }] }),
      );

      const result = await service.findOne('article-1');

      expect(prismaServiceMock.article.findUnique).toHaveBeenCalledWith({
        where: { id: 'article-1' },
        include: {
          tags: {
            select: { name: true },
          },
        },
      });
      expect(result.tags).toEqual(['nodejs', 'nestjs']);
      expect(result.createdAt).toBe(1000);
      expect(result.updatedAt).toBe(2000);
    });

    it('throws NotFoundError when article is missing', async () => {
      prismaServiceMock.article.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundError when article does not exist', async () => {
      prismaServiceMock.article.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing-id', { title: 'New title' }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('allows status transition from draft to published', async () => {
      prismaServiceMock.article.findUnique.mockResolvedValue(
        makeDbArticle({ status: ArticleStatus.DRAFT }),
      );
      prismaServiceMock.article.update.mockResolvedValue(
        makeDbArticle({ status: ArticleStatus.PUBLISHED }),
      );

      const result = await service.update('article-1', {
        status: ArticleStatus.PUBLISHED,
      });

      expect(result.status).toBe(ArticleStatus.PUBLISHED);
    });

    it('allows status transition from published to archived', async () => {
      prismaServiceMock.article.findUnique.mockResolvedValue(
        makeDbArticle({ status: ArticleStatus.PUBLISHED }),
      );
      prismaServiceMock.article.update.mockResolvedValue(
        makeDbArticle({ status: ArticleStatus.ARCHIVED }),
      );

      const result = await service.update('article-1', {
        status: ArticleStatus.ARCHIVED,
      });

      expect(result.status).toBe(ArticleStatus.ARCHIVED);
    });

    it('throws UnprocessableEntityError for transition from published to draft', async () => {
      prismaServiceMock.article.findUnique.mockResolvedValue(
        makeDbArticle({ status: ArticleStatus.PUBLISHED }),
      );

      await expect(
        service.update('article-1', { status: ArticleStatus.DRAFT }),
      ).rejects.toBeInstanceOf(UnprocessableEntityError);
      expect(prismaServiceMock.article.update).not.toHaveBeenCalled();
    });

    it('throws UnprocessableEntityError for transition from archived to published', async () => {
      prismaServiceMock.article.findUnique.mockResolvedValue(
        makeDbArticle({ status: ArticleStatus.ARCHIVED }),
      );

      await expect(
        service.update('article-1', { status: ArticleStatus.PUBLISHED }),
      ).rejects.toBeInstanceOf(UnprocessableEntityError);
      expect(prismaServiceMock.article.update).not.toHaveBeenCalled();
    });

    it('updates article and replaces tags when tags are provided', async () => {
      prismaServiceMock.article.findUnique.mockResolvedValue(makeDbArticle());
      prismaServiceMock.article.update.mockResolvedValue(
        makeDbArticle({
          title: 'Updated title',
          tags: [{ name: 'updated' }, { name: 'tag' }],
          updatedAt: BigInt(3000),
        }),
      );

      const result = await service.update('article-1', {
        title: 'Updated title',
        tags: ['updated', 'tag'],
      });

      expect(prismaServiceMock.article.update).toHaveBeenCalledWith({
        where: { id: 'article-1' },
        data: {
          title: 'Updated title',
          updatedAt: expect.any(BigInt),
          tags: {
            set: [],
            connectOrCreate: [
              {
                where: { name: 'updated' },
                create: { name: 'updated' },
              },
              {
                where: { name: 'tag' },
                create: { name: 'tag' },
              },
            ],
          },
        },
        include: {
          tags: {
            select: { name: true },
          },
        },
      });
      expect(result.tags).toEqual(['updated', 'tag']);
      expect(result.updatedAt).toBe(3000);
    });

    it('updates article without tag mutation when tags are omitted', async () => {
      prismaServiceMock.article.findUnique.mockResolvedValue(makeDbArticle());
      prismaServiceMock.article.update.mockResolvedValue(
        makeDbArticle({ content: 'Updated content', updatedAt: BigInt(4000) }),
      );

      await service.update('article-1', { content: 'Updated content' });

      expect(prismaServiceMock.article.update).toHaveBeenCalledWith({
        where: { id: 'article-1' },
        data: {
          content: 'Updated content',
          updatedAt: expect.any(BigInt),
        },
        include: {
          tags: {
            select: { name: true },
          },
        },
      });
    });
  });

  describe('remove', () => {
    it('deletes article when it exists', async () => {
      prismaServiceMock.article.findUnique.mockResolvedValue(makeDbArticle());
      prismaServiceMock.article.delete.mockResolvedValue({ id: 'article-1' });

      await service.remove('article-1');

      expect(prismaServiceMock.article.delete).toHaveBeenCalledWith({
        where: { id: 'article-1' },
      });
    });

    it('throws NotFoundError when remove target does not exist', async () => {
      prismaServiceMock.article.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing-id')).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(prismaServiceMock.article.delete).not.toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('returns true when article exists', async () => {
      prismaServiceMock.article.findUnique.mockResolvedValue({
        id: 'article-1',
      });

      const result = await service.exists('article-1');

      expect(prismaServiceMock.article.findUnique).toHaveBeenCalledWith({
        where: { id: 'article-1' },
        select: { id: true },
      });
      expect(result).toBe(true);
    });

    it('returns false when article does not exist', async () => {
      prismaServiceMock.article.findUnique.mockResolvedValue(null);

      const result = await service.exists('missing-id');

      expect(result).toBe(false);
    });
  });
});
