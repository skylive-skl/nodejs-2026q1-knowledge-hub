import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ArticleService } from 'src/article/article.service';

describe('CommentService', () => {
  let service: CommentService;

  const prismaServiceMock = {
    comment: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  const articleServiceMock = {
    exists: vi.fn(),
  };

  const makeDbComment = (overrides: Partial<any> = {}) => ({
    id: 'comment-1',
    content: 'Comment body',
    articleId: '13ef4f88-f887-42a3-b7ea-3a65c4977e24',
    authorId: null,
    createdAt: BigInt(1000),
    ...overrides,
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CommentService,
          useFactory: (
            prismaService: PrismaService,
            injectedArticleService: ArticleService,
          ) => new CommentService(prismaService, injectedArticleService),
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

    service = module.get<CommentService>(CommentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('throws UnprocessableEntityException when article does not exist', async () => {
      articleServiceMock.exists.mockResolvedValue(false);

      await expect(
        service.create({
          content: 'text',
          articleId: '13ef4f88-f887-42a3-b7ea-3a65c4977e24',
          authorId: null,
        }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(prismaServiceMock.comment.create).not.toHaveBeenCalled();
    });

    it('creates comment for existing article', async () => {
      articleServiceMock.exists.mockResolvedValue(true);
      prismaServiceMock.comment.create.mockResolvedValue(makeDbComment());

      const result = await service.create({
        content: 'text',
        articleId: '13ef4f88-f887-42a3-b7ea-3a65c4977e24',
        authorId: null,
      });

      expect(prismaServiceMock.comment.create).toHaveBeenCalledWith({
        data: {
          content: 'text',
          articleId: '13ef4f88-f887-42a3-b7ea-3a65c4977e24',
          authorId: null,
          createdAt: expect.any(BigInt),
        },
      });
      expect(result.createdAt).toBe(1000);
      expect(result.id).toBe('comment-1');
    });
  });

  describe('findAll', () => {
    it('filters by articleId and sorts comments', async () => {
      prismaServiceMock.comment.findMany.mockResolvedValue([
        makeDbComment({ id: 'c-1', content: 'B' }),
        makeDbComment({ id: 'c-2', content: 'A' }),
      ]);

      const result = await service.findAll({
        articleId: '13ef4f88-f887-42a3-b7ea-3a65c4977e24',
        sortBy: 'content',
        order: 'asc',
      });

      expect(prismaServiceMock.comment.findMany).toHaveBeenCalledWith({
        where: { articleId: '13ef4f88-f887-42a3-b7ea-3a65c4977e24' },
      });
      expect(result.map((item) => item.content)).toEqual(['A', 'B']);
    });

    it('returns paginated result', async () => {
      prismaServiceMock.comment.findMany.mockResolvedValue([
        makeDbComment({ id: 'c-1', content: 'First' }),
        makeDbComment({ id: 'c-2', content: 'Second' }),
      ]);

      const result = await service.findAll({ page: 2, limit: 1 });

      expect(result.total).toBe(2);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].content).toBe('Second');
    });
  });

  describe('findOne', () => {
    it('returns normalized comment', async () => {
      prismaServiceMock.comment.findUnique.mockResolvedValue(makeDbComment());

      const result = await service.findOne('comment-1');

      expect(prismaServiceMock.comment.findUnique).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
      });
      expect(result.createdAt).toBe(1000);
      expect(result.id).toBe('comment-1');
    });

    it('throws NotFoundException for missing comment', async () => {
      prismaServiceMock.comment.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException when comment does not exist', async () => {
      prismaServiceMock.comment.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing-id', { content: 'new text' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates comment when it exists', async () => {
      prismaServiceMock.comment.findUnique.mockResolvedValue(makeDbComment());
      prismaServiceMock.comment.update.mockResolvedValue(
        makeDbComment({ content: 'updated content' }),
      );

      const result = await service.update('comment-1', {
        content: 'updated content',
      });

      expect(prismaServiceMock.comment.update).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
        data: { content: 'updated content' },
      });
      expect(result.content).toBe('updated content');
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when comment does not exist', async () => {
      prismaServiceMock.comment.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prismaServiceMock.comment.delete).not.toHaveBeenCalled();
    });

    it('deletes comment when it exists', async () => {
      prismaServiceMock.comment.findUnique.mockResolvedValue(makeDbComment());
      prismaServiceMock.comment.delete.mockResolvedValue(makeDbComment());

      await service.remove('comment-1');

      expect(prismaServiceMock.comment.delete).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
      });
    });
  });
});
