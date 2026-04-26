import 'reflect-metadata';
import { instanceToPlain } from 'class-transformer';
import { UserEntity } from './users.entity';
import { UserRole } from 'src/common/enums';

describe('UserEntity Serialization', () => {
  it('strips password field from serialized output', () => {
    const entity = new UserEntity({
      id: 'user-1',
      login: 'john',
      password: 'secret',
      role: UserRole.ADMIN,
      createdAt: 1000,
      updatedAt: 2000,
    });

    const plain = instanceToPlain(entity);

    expect(plain).not.toHaveProperty('password');
    expect(plain).toMatchObject({
      id: 'user-1',
      login: 'john',
      role: UserRole.ADMIN,
      createdAt: 1000,
      updatedAt: 2000,
    });
  });
});
