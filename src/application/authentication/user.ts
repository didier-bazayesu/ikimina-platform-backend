export type UserRole = 'MEMBER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'EXITED';

export interface User {
  id: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  joinedDate: Date;
  createdAt: Date;
}
