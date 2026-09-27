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
import type { Member, MemberWithStats } from './member';
import type { UserStatus } from '../authentication/user';
import type { MonthlyObligationServiceInterface } from '../monthly-obligation/monthly-obligation.service.interface';
import { MONTHLY_OBLIGATION_SERVICE } from '../monthly-obligation/monthly-obligation.service.interface';
import type { MonthlyObligationRepositoryInterface } from '../monthly-obligation/monthly-obligation.repository.interface';
import { MONTHLY_OBLIGATION_REPOSITORY } from '../monthly-obligation/monthly-obligation.repository.interface';
import type { PenaltyRepositoryInterface } from '../penalty/penalty.repository.interface';
import { PENALTY_REPOSITORY } from '../penalty/penalty.repository.interface';
import type { ContributionRepositoryInterface } from '../payment/contribution.repository.interface';
import { CONTRIBUTION_REPOSITORY } from '../payment/contribution.repository.interface';

import type { AuditLogServiceInterface } from '../audit-log/audit-log.service.interface';
import { AUDIT_LOG_SERVICE } from '../audit-log/audit-log.service.interface';

@Injectable()
export class MemberService implements MemberServiceInterface {
  constructor(
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepository: MemberRepositoryInterface,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryInterface,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherInterface,
    @Inject(MONTHLY_OBLIGATION_SERVICE)
    private readonly obligationService: MonthlyObligationServiceInterface,
    @Inject(MONTHLY_OBLIGATION_REPOSITORY)
    private readonly obligationRepository: MonthlyObligationRepositoryInterface,
    @Inject(PENALTY_REPOSITORY)
    private readonly penaltyRepository: PenaltyRepositoryInterface,
    @Inject(CONTRIBUTION_REPOSITORY)
    private readonly contributionRepository: ContributionRepositoryInterface,
    @Inject(AUDIT_LOG_SERVICE)
    private readonly auditLogService: AuditLogServiceInterface,
  ) {}

  // ── IKM-2.2: POST /members ────────────────────────────────────────────────

  async createMember(params: CreateMemberParams): Promise<Member> {
    const existingByEmail = await this.userRepository.findByEmail(params.email);
    let oldUserId: string | null = null;
    if (existingByEmail) {
      if (existingByEmail.status !== 'EXITED') {
        throw new ConflictException('Email is already registered to an active account');
      }
      oldUserId = existingByEmail.id;
    }

    const existingByPhone = await this.userRepository.findByPhone(params.phone);
    if (existingByPhone) {
      if (existingByPhone.status !== 'EXITED') {
        throw new ConflictException('Phone number is already registered to an active account');
      }
      if (!oldUserId) oldUserId = existingByPhone.id;
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

    const member = await this.memberRepository.create({
      userId: user.id,
      fullName: params.fullName,
      nationalId: params.nationalId,
      address: params.address,
      joinedDate,
    });

    if (oldUserId && params.adminUserId) {
      await this.auditLogService.recordLog({
        adminUserId: params.adminUserId,
        actionType: 'MEMBER_REJOINED',
        entityName: 'Member',
        entityId: member.id, // Using the new member's ID as the main entity
        oldState: { oldUserId, oldStatus: 'EXITED' },
        newState: { newUserId: user.id, newStatus: 'ACTIVE' },
      });
    }

    return member;
  }

  // ── IKM-2.3: GET /members ─────────────────────────────────────────────────

  async listMembers(params: ListMembersParams): Promise<ListMembersResponse> {
    const page = Math.max(params.page ?? 1, 1);
    const limit = Math.min(params.limit ?? 20, 100);
    
    const result = await this.memberRepository.list({
      status: params.status,
      search: params.search,
      page,
      limit,
    });

    const memberIds = result.items.map(m => m.id);

    const [
      paidCount,
      overdueCount,
      unpaidPenaltyAmounts,
      approvedTotals,
      lastPenaltyDate,
      lastContribDate
    ] = await Promise.all([
      this.obligationRepository.countPaidForMembers(memberIds),
      this.obligationService.countOverdueForMembers(memberIds),
      this.penaltyRepository.getUnpaidAmountsForMembers(memberIds),
      this.contributionRepository.getApprovedTotalsForMembers(memberIds),
      this.penaltyRepository.getLastApprovedPaymentDatesForMembers(memberIds),
      this.contributionRepository.getLastApprovedPaymentDatesForMembers(memberIds),
    ]);

    const enrichedItems: MemberWithStats[] = result.items.map((m) => {
      const pDate = lastPenaltyDate.get(m.id);
      const cDate = lastContribDate.get(m.id);
      let lastPayment: Date | null = null;
      if (pDate && cDate) {
        lastPayment = pDate > cDate ? pDate : cDate;
      } else {
        lastPayment = pDate || cDate || null;
      }

      return {
        ...m,
        shares: paidCount.get(m.id) ?? 0,
        missing: overdueCount.get(m.id) ?? 0,
        unpaidPenalty: unpaidPenaltyAmounts.get(m.id) ?? 0,
        contributed: approvedTotals.get(m.id) ?? 0,
        lastPayment,
      };
    });

    return {
      items: enrichedItems,
      page: result.page,
      limit: result.limit,
      total: result.total,
    };
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

    if (member.status === 'EXITED') {
      throw new BadRequestException(
        'An exited member cannot be modified. They must rejoin as a new member.',
      );
    }

    if (params.status !== 'ACTIVE' && !params.reason?.trim()) {
      throw new BadRequestException(
        'A reason is required when suspending or exiting a member',
      );
    }

    const oldStatus = member.status;
    await this.userRepository.updateStatus(member.userId, params.status);
    
    if (params.adminUserId) {
      await this.auditLogService.recordLog({
        adminUserId: params.adminUserId,
        actionType: 'MEMBER_STATUS_CHANGED',
        entityName: 'Member',
        entityId: member.id,
        oldState: { status: oldStatus },
        newState: { status: params.status, reason: params.reason },
      });
    }

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
