import { type Role } from './user';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

export interface AuthenticationServiceInterface {
  login(email: string, password: string): Promise<LoginResult>;
}

export const AUTHENTICATION_SERVICE = Symbol('AUTHENTICATION_SERVICE');
