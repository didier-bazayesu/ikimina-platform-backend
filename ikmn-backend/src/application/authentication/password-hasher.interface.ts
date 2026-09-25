export interface PasswordHasherInterface {
  hash(plainPassword: string): Promise<string>;
  verify(plainPassword: string, passwordHash: string): Promise<boolean>;
}

// Runtime token value for NestJS Dependency Injection
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
