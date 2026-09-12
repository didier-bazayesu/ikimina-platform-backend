import { type UserRole } from './user';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export interface AuthenticationServiceInterface {
  login(email: string, password: string): Promise<LoginResult>;
}

export const AUTHENTICATION_SERVICE = Symbol('AUTHENTICATION_SERVICE');
