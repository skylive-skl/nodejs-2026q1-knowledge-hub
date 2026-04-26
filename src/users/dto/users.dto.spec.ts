import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { UpdateUserPasswordDto } from './update-user-password.dto';
import { UpdateUserRoleDto } from './update-user-role.dto';
import { UserRole } from 'src/common/enums';

describe('Users DTO Validation', () => {
  describe('CreateUserDto', () => {
    it('fails when required fields are missing', async () => {
      const dto = new CreateUserDto();
      const errors = await validate(dto);

      const properties = errors.map((err) => err.property);
      expect(properties).toContain('login');
      expect(properties).toContain('password');
    });

    it('fails when role enum value is invalid', async () => {
      const dto = new CreateUserDto();
      dto.login = 'valid-login';
      dto.password = 'valid-password';
      dto.role = 'root' as UserRole;

      const errors = await validate(dto);
      expect(errors.some((err) => err.property === 'role')).toBe(true);
    });

    it('passes for valid payload', async () => {
      const dto = new CreateUserDto();
      dto.login = 'valid-login';
      dto.password = 'valid-password';
      dto.role = UserRole.EDITOR;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('UpdateUserPasswordDto', () => {
    it('fails when password fields are missing', async () => {
      const dto = new UpdateUserPasswordDto();
      const errors = await validate(dto);

      const properties = errors.map((err) => err.property);
      expect(properties).toContain('oldPassword');
      expect(properties).toContain('newPassword');
    });

    it('passes for valid payload', async () => {
      const dto = new UpdateUserPasswordDto();
      dto.oldPassword = 'old-pass';
      dto.newPassword = 'new-pass';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('UpdateUserRoleDto', () => {
    it('fails when role enum value is invalid', async () => {
      const dto = new UpdateUserRoleDto();
      dto.role = 'owner' as UserRole;

      const errors = await validate(dto);
      expect(errors.some((err) => err.property === 'role')).toBe(true);
    });

    it('passes for valid payload', async () => {
      const dto = new UpdateUserRoleDto();
      dto.role = UserRole.ADMIN;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
