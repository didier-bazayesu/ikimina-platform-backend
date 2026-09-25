import type { Member, MemberWithStats } from './member';
import type { UserStatus } from '../authentication/user';

export interface CreateMemberParams {
  email: string;
  phone: string;
  password: string;
  fullName: string;
  nationalId?: string;
  address?: string;
  joinedDate?: string; // ISO date string from DTO
}

export interface UpdateMemberParams {
  fullName?: string;
  phone?: string;
  address?: string;
  nationalId?: string;
}

export interface UpdateOwnProfileParams {
  fullName?: string;
  phone?: string;
  address?: string;
}

export interface UpdateMemberStatusParams {
  status: UserStatus;
  reason?: string;
}

export interface ListMembersParams {
  status?: UserStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ListMembersResponse {
  items: MemberWithStats[];
  page: number;
  limit: number;
  total: number;
}

export interface MemberServiceInterface {
  createMember(params: CreateMemberParams): Promise<Member>;
  listMembers(params: ListMembersParams): Promise<ListMembersResponse>;
  getMemberById(id: string): Promise<Member>;
  updateMember(id: string, params: UpdateMemberParams): Promise<Member>;
  updateMemberStatus(
    id: string,
    params: UpdateMemberStatusParams,
  ): Promise<{ id: string; status: UserStatus }>;
  getMyProfile(userId: string): Promise<Member>;
  updateMyProfile(
    userId: string,
    params: UpdateOwnProfileParams,
  ): Promise<Member>;
}

export const MEMBER_SERVICE = Symbol('MEMBER_SERVICE');
