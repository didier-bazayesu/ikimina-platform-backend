import { User, UserRole } from './user';

export interface CreateUserInput {
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
}

export interface UserRepositoryInterface {
  create(input: CreateUserInput): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
}

// Runtime token value for NestJS Dependency Injection
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
