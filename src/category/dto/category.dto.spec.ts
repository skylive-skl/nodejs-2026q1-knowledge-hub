import 'reflect-metadata';
import { validate } from 'class-validator';
import { CreateCategoryDto } from './create-category.dto';
import { SearchCategoryDto } from './search-category.dto';
import { UpdateCategoryDto } from './update-category.dto';

describe('Category DTO Validation', () => {
  describe('CreateCategoryDto', () => {
    it('fails when required fields are missing', async () => {
      const dto = new CreateCategoryDto();
      const errors = await validate(dto);
      const properties = errors.map((err) => err.property);

      expect(properties).toContain('name');
      expect(properties).toContain('description');
    });

    it('fails when field lengths are invalid', async () => {
      const dto = new CreateCategoryDto();
      dto.name = 'A';
      dto.description = 'B';

      const errors = await validate(dto);
      const properties = errors.map((err) => err.property);

      expect(properties).toContain('name');
      expect(properties).toContain('description');
    });

    it('passes for valid payload', async () => {
      const dto = new CreateCategoryDto();
      dto.name = 'Backend';
      dto.description = 'Backend development category';

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('UpdateCategoryDto', () => {
    it('passes for partial valid payload', async () => {
      const dto = new UpdateCategoryDto();
      dto.description = 'Updated description';

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('SearchCategoryDto', () => {
    it('fails for invalid list query fields', async () => {
      const dto = new SearchCategoryDto();
      (dto as any).page = 0;
      (dto as any).limit = 101;
      (dto as any).order = 'up';

      const errors = await validate(dto);
      const properties = errors.map((err) => err.property);

      expect(properties).toContain('page');
      expect(properties).toContain('limit');
      expect(properties).toContain('order');
    });

    it('passes for valid list query fields', async () => {
      const dto = new SearchCategoryDto();
      dto.page = 1;
      dto.limit = 10;
      dto.order = 'asc';
      dto.sortBy = 'name';

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });
});
