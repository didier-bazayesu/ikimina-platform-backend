import { User, Role } from './user';

export interface CreateUserInput {
  email: string;
  phone: string;
  passwordHash: string;
  role: Role;
}

export interface UserRepositoryInterface {
  create(input: CreateUserInput): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
}

// Runtime token value for NestJS Dependency Injection
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
