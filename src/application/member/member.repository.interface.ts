import type { Member } from './member';
import type { UserStatus } from '../authentication/user';

export interface CreateMemberInput {
  userId: string;
  fullName: string;
  nationalId?: string;
  address?: string;
  joinedDate?: Date;
}

export interface UpdateMemberInput {
  fullName?: string;
  phone?: string;
  address?: string;
  nationalId?: string;
}

export interface ListMembersFilter {
  status?: UserStatus;
  search?: string;
  page: number;
  limit: number;
}

export interface ListMembersResult {
  items: Member[];
  page: number;
  limit: number;
  total: number;
}

export interface MemberRepositoryInterface {
  create(input: CreateMemberInput): Promise<Member>;
  findById(id: string): Promise<Member | null>;
  findByUserId(userId: string): Promise<Member | null>;
  findByMemberNumber(memberNumber: string): Promise<Member | null>;
  list(filter: ListMembersFilter): Promise<ListMembersResult>;
  update(id: string, input: UpdateMemberInput): Promise<Member | null>;
}

// Runtime token for NestJS DI
export const MEMBER_REPOSITORY = Symbol('MEMBER_REPOSITORY');
