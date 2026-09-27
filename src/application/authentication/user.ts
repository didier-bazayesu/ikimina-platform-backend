export type Role = 'MEMBER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'EXITED';

export interface User {
  id: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  joinedDate: Date;
  createdAt: Date;
}
