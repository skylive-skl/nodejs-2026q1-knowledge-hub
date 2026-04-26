import 'reflect-metadata';
import { validate } from 'class-validator';
import { CreateArticleDto } from './create-article.dto';
import { SearchArticleDto } from './search-article.dto';
import { UpdateArticleDto } from './update-article.dto';
import { ArticleStatus } from 'src/common/enums';

describe('Article DTO Validation', () => {
  describe('CreateArticleDto', () => {
    it('fails when required fields are missing', async () => {
      const dto = new CreateArticleDto();
      const errors = await validate(dto);
      const properties = errors.map((e) => e.property);

      expect(properties).toContain('title');
      expect(properties).toContain('content');
      expect(properties).toContain('tags');
    });

    it('fails on invalid enum and invalid UUID values', async () => {
      const dto = new CreateArticleDto();
      dto.title = 'Valid title';
      dto.content = 'Valid content';
      dto.tags = ['nestjs'];
      dto.status = 'invalid-status' as ArticleStatus;
      dto.authorId = 'not-a-uuid';
      dto.categoryId = 'not-a-uuid';

      const errors = await validate(dto);
      const properties = errors.map((e) => e.property);

      expect(properties).toContain('status');
      expect(properties).toContain('authorId');
      expect(properties).toContain('categoryId');
    });

    it('passes for valid payload', async () => {
      const dto = new CreateArticleDto();
      dto.title = 'Valid title';
      dto.content = 'Valid content';
      dto.status = ArticleStatus.DRAFT;
      dto.tags = ['nestjs', 'testing'];
      dto.authorId = '6a631748-ab08-4ef4-a4c8-bcf02dd7f19f';
      dto.categoryId = '2c293ef3-f211-40e4-a203-bf85f435f18d';

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('UpdateArticleDto', () => {
    it('passes for partial valid payload', async () => {
      const dto = new UpdateArticleDto();
      dto.title = 'Updated title';

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('SearchArticleDto', () => {
    it('fails when status enum value is invalid', async () => {
      const dto = new SearchArticleDto();
      dto.status = 'unknown' as ArticleStatus;

      const errors = await validate(dto);

      expect(errors.some((e) => e.property === 'status')).toBe(true);
    });

    it('fails when categoryId is malformed UUID', async () => {
      const dto = new SearchArticleDto();
      dto.categoryId = 'bad-uuid';

      const errors = await validate(dto);

      expect(errors.some((e) => e.property === 'categoryId')).toBe(true);
    });

    it('passes for valid filter payload', async () => {
      const dto = new SearchArticleDto();
      dto.status = ArticleStatus.PUBLISHED;
      dto.tag = 'nestjs';
      dto.categoryId = '2c293ef3-f211-40e4-a203-bf85f435f18d';
      dto.sortBy = 'title';
      dto.order = 'asc';
      dto.page = 1;
      dto.limit = 10;

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });
});
