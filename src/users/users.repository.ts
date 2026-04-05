import { User } from 'src/common/interfaces';

export class UsersRepository {
  private readonly users = new Map<string, User>();

  findAll(): User[] {
    return Array.from(this.users.values());
  }

  findById(id: string): User | undefined {
    return this.users.get(id);
  }

  findByLogin(login: string): User | undefined {
    return Array.from(this.users.values()).find((user) => user.login === login);
  }

  create(user: User): User {
    this.users.set(user.id, user);
    return user;
  }

  update(id: string, updatedUser: Partial<User>): User | undefined {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    const newUser = { ...existingUser, ...updatedUser };
    this.users.set(id, newUser);
    return newUser;
  }

  delete(id: string): boolean {
    return this.users.delete(id);
  }

  clear(): void {
    this.users.clear();
  }
}
