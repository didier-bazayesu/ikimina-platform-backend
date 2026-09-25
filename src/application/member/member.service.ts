import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { MemberServiceInterface } from './member.service.interface';
import type {
  CreateMemberParams,
  UpdateMemberParams,
  UpdateOwnProfileParams,
  UpdateMemberStatusParams,
  ListMembersParams,
  ListMembersResponse,
} from './member.service.interface';
import type { MemberRepositoryInterface } from './member.repository.interface';
import { MEMBER_REPOSITORY } from './member.repository.interface';
import type { UserRepositoryInterface } from '../authentication/user.repository.interface';
import { USER_REPOSITORY } from '../authentication/user.repository.interface';
import type { PasswordHasherInterface } from '../authentication/password-hasher.interface';
import { PASSWORD_HASHER } from '../authentication/password-hasher.interface';
import type { Member } from './member';
import type { UserStatus } from '../authentication/user';

@Injectable()
export class MemberService implements MemberServiceInterface {
  constructor(
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepository: MemberRepositoryInterface,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryInterface,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherInterface,
  ) {}

  // ── IKM-2.2: POST /members ────────────────────────────────────────────────

  async createMember(params: CreateMemberParams): Promise<Member> {
    const existingByEmail = await this.userRepository.findByEmail(params.email);
    if (existingByEmail) {
      throw new ConflictException('Email is already registered');
    }

    const existingByPhone = await this.userRepository.findByPhone(params.phone);
    if (existingByPhone) {
      throw new ConflictException('Phone number is already registered');
    }

    const passwordHash = await this.passwordHasher.hash(params.password);

    const user = await this.userRepository.create({
      email: params.email,
      phone: params.phone,
      passwordHash,
      role: 'MEMBER',
    });

    const joinedDate = params.joinedDate
      ? new Date(params.joinedDate)
      : undefined;

    return this.memberRepository.create({
      userId: user.id,
      fullName: params.fullName,
      nationalId: params.nationalId,
      address: params.address,
      joinedDate,
    });
  }

  // ── IKM-2.3: GET /members ─────────────────────────────────────────────────

  async listMembers(params: ListMembersParams): Promise<ListMembersResponse> {
    const page = Math.max(params.page ?? 1, 1);
    const limit = Math.min(params.limit ?? 20, 100);
    return this.memberRepository.list({
      status: params.status,
      search: params.search,
      page,
      limit,
    });
  }

  // ── IKM-2.4: GET /members/:id ─────────────────────────────────────────────

  async getMemberById(id: string): Promise<Member> {
    const member = await this.memberRepository.findById(id);
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  // ── IKM-2.5: PATCH /members/:id ──────────────────────────────────────────

  async updateMember(id: string, params: UpdateMemberParams): Promise<Member> {
    const member = await this.memberRepository.findById(id);
    if (!member) throw new NotFoundException('Member not found');

    if (params.phone !== undefined) {
      const existing = await this.userRepository.findByPhone(params.phone);
      if (existing && existing.id !== member.userId) {
        throw new ConflictException('Phone number is already registered');
      }
      await this.userRepository.updatePhone(member.userId, params.phone);
    }

    const updated = await this.memberRepository.update(id, {
      fullName: params.fullName,
      address: params.address,
      nationalId: params.nationalId,
    });

    return (await this.memberRepository.findById(id)) ?? updated ?? member;
  }

  // ── IKM-2.6: PATCH /members/:id/status ───────────────────────────────────

  async updateMemberStatus(
    id: string,
    params: UpdateMemberStatusParams,
  ): Promise<{ id: string; status: UserStatus }> {
    const member = await this.memberRepository.findById(id);
    if (!member) throw new NotFoundException('Member not found');

    if (params.status !== 'ACTIVE' && !params.reason?.trim()) {
      throw new BadRequestException(
        'A reason is required when suspending or exiting a member',
      );
    }

    await this.userRepository.updateStatus(member.userId, params.status);
    return { id: member.id, status: params.status };
  }

  // ── IKM-2.7: GET /members/me ──────────────────────────────────────────────

  async getMyProfile(userId: string): Promise<Member> {
    const member = await this.memberRepository.findByUserId(userId);
    if (!member) {
      throw new NotFoundException('No member profile found for this account');
    }
    return member;
  }

  // ── IKM-2.8: PATCH /members/me ───────────────────────────────────────────

  async updateMyProfile(
    userId: string,
    params: UpdateOwnProfileParams,
  ): Promise<Member> {
    const member = await this.memberRepository.findByUserId(userId);
    if (!member) {
      throw new NotFoundException('No member profile found for this account');
    }

    if (params.phone !== undefined) {
      const existing = await this.userRepository.findByPhone(params.phone);
      if (existing && existing.id !== userId) {
        throw new ConflictException('Phone number is already registered');
      }
      await this.userRepository.updatePhone(userId, params.phone);
    }

    const updated = await this.memberRepository.update(member.id, {
      fullName: params.fullName,
      address: params.address,
    });

    return (
      (await this.memberRepository.findByUserId(userId)) ?? updated ?? member
    );
  }
}
