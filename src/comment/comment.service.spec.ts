import { Test, TestingModule } from '@nestjs/testing';
import { CommentService } from './comment.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ArticleService } from 'src/article/article.service';

describe('CommentService', () => {
  let service: CommentService;

  const prismaServiceMock = {
    comment: {},
  };

  const articleServiceMock = {
    exists: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
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
});
