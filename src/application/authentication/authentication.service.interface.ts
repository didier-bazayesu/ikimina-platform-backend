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

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticationServiceInterface {
  login(email: string, password: string): Promise<LoginResult>;
  refresh(refreshToken: string): Promise<TokenPair>;
  logout(refreshToken: string, allDevices?: boolean): Promise<void>;
  changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void>;
}

export const AUTHENTICATION_SERVICE = Symbol('AUTHENTICATION_SERVICE');
