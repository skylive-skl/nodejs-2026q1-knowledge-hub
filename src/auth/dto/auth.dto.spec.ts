import { validate } from 'class-validator';
import { LoginDto } from './login.dto';
import { SignupDto } from './signup.dto';
import { RefreshDto } from './refresh.dto';

describe('Auth DTO Validation', () => {
  describe('SignupDto', () => {
    it('fails when required fields are missing', async () => {
      const dto = new SignupDto();
      const errors = await validate(dto);
      const properties = errors.map((e) => e.property);

      expect(properties).toContain('login');
      expect(properties).toContain('password');
    });

    it('passes for valid payload', async () => {
      const dto = new SignupDto();
      dto.login = 'john';
      dto.password = 'strong-password';

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('LoginDto', () => {
    it('fails when required fields are missing', async () => {
      const dto = new LoginDto();
      const errors = await validate(dto);
      const properties = errors.map((e) => e.property);

      expect(properties).toContain('login');
      expect(properties).toContain('password');
    });

    it('passes for valid payload', async () => {
      const dto = new LoginDto();
      dto.login = 'john';
      dto.password = 'strong-password';

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('RefreshDto', () => {
    it('fails when refreshToken has invalid type', async () => {
      const dto = new RefreshDto();
      (dto as any).refreshToken = 123;

      const errors = await validate(dto);

      expect(errors.some((e) => e.property === 'refreshToken')).toBe(true);
    });

    it('passes when refreshToken is omitted because field is optional', async () => {
      const dto = new RefreshDto();

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('passes for valid payload', async () => {
      const dto = new RefreshDto();
      dto.refreshToken = 'refresh-token';

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });
});
