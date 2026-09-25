import type { UserStatus } from '../authentication/user';

export interface Member {
  id: string;
  memberNumber: string;
  fullName: string;
  nationalId: string | null;
  address: string | null;
  joinedDate: Date;
  createdAt: Date;
  // hydrated from joined users row — never stored on members table
  userId: string;
  email: string;
  phone: string;
  status: UserStatus;
}

export interface MemberWithStats extends Member {
  shares: number;
  contributed: number;
  unpaidPenalty: number;
  missing: number;
  lastPayment: Date | null;
}
