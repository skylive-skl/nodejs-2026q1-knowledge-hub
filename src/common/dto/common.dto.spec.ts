import 'reflect-metadata';
import { validate } from 'class-validator';
import { ListQueryDto } from './list-query.dto';
import { UUIDDto } from './uuid.dto';

describe('Common DTO Validation', () => {
  describe('UUIDDto', () => {
    it('fails for malformed UUID', async () => {
      const dto = new UUIDDto();
      dto.id = 'not-a-uuid';

      const errors = await validate(dto);

      expect(errors.some((err) => err.property === 'id')).toBe(true);
    });

    it('passes for valid UUID v4', async () => {
      const dto = new UUIDDto();
      dto.id = '13ef4f88-f887-42a3-b7ea-3a65c4977e24';

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('ListQueryDto', () => {
    it('fails for invalid pagination and order values', async () => {
      const dto = new ListQueryDto();
      dto.page = 0;
      dto.limit = 101;
      dto.order = 'up' as any;

      const errors = await validate(dto);
      const properties = errors.map((err) => err.property);

      expect(properties).toContain('page');
      expect(properties).toContain('limit');
      expect(properties).toContain('order');
    });

    it('passes for valid list query', async () => {
      const dto = new ListQueryDto();
      dto.page = 1;
      dto.limit = 20;
      dto.sortBy = 'createdAt';
      dto.order = 'desc';

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });
});
