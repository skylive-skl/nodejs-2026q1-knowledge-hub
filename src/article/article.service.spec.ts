import { Test, TestingModule } from '@nestjs/testing';
import { ArticleService } from './article.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommentService } from 'src/comment/comment.service';

describe('ArticleService', () => {
  let service: ArticleService;

  const prismaServiceMock = {
    article: {},
  };

  const commentServiceMock = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
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
});
