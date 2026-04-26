import 'reflect-metadata';
import { validate } from 'class-validator';
import { CreateCommentDto } from './create-comment.dto';
import { SearchCommentDto } from './search-comment.dto';
import { UpdateCommentDto } from './update-comment.dto';

describe('Comment DTO Validation', () => {
  describe('CreateCommentDto', () => {
    it('fails when required fields are missing', async () => {
      const dto = new CreateCommentDto();
      const errors = await validate(dto);
      const properties = errors.map((err) => err.property);

      expect(properties).toContain('content');
      expect(properties).toContain('articleId');
    });

    it('fails for malformed UUID fields', async () => {
      const dto = new CreateCommentDto();
      dto.content = 'Valid comment';
      dto.articleId = 'bad-uuid';
      dto.authorId = 'bad-uuid';

      const errors = await validate(dto);
      const properties = errors.map((err) => err.property);

      expect(properties).toContain('articleId');
      expect(properties).toContain('authorId');
    });

    it('passes for valid payload', async () => {
      const dto = new CreateCommentDto();
      dto.content = 'Valid comment';
      dto.articleId = '13ef4f88-f887-42a3-b7ea-3a65c4977e24';
      dto.authorId = 'd963c8b2-8fd8-4e20-a125-c66caf95f049';

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('UpdateCommentDto', () => {
    it('passes for partial valid payload', async () => {
      const dto = new UpdateCommentDto();
      dto.content = 'Updated content';

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('SearchCommentDto', () => {
    it('fails when articleId is malformed UUID', async () => {
      const dto = new SearchCommentDto();
      dto.articleId = 'bad-uuid';

      const errors = await validate(dto);

      expect(errors.some((err) => err.property === 'articleId')).toBe(true);
    });

    it('passes for valid payload', async () => {
      const dto = new SearchCommentDto();
      dto.articleId = '13ef4f88-f887-42a3-b7ea-3a65c4977e24';
      dto.page = 1;
      dto.limit = 20;
      dto.order = 'desc';
      dto.sortBy = 'createdAt';

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });
});
