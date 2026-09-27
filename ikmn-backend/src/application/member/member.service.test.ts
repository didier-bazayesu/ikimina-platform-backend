import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { MemberService } from './member.service';
import { createMemberRepositoryMock } from './member.repository.mock';
import { createUserRepositoryMock } from '../authentication/user.repository.mock';
import type { MemberRepositoryInterface } from './member.repository.interface';
import type { UserRepositoryInterface } from '../authentication/user.repository.interface';
import type { Member } from './member';
import type { User } from '../authentication/user';

// ── fixtures ─────────────────────────────────────────────────────────────────

const baseUser: User = {
  id: 'user-1',
  email: 'alice@example.com',
  phone: '+250788000001',
  passwordHash: 'hashed',
  role: 'MEMBER',
  status: 'ACTIVE',
  joinedDate: new Date('2026-01-01'),
  createdAt: new Date('2026-01-01'),
};

const baseMember: Member = {
  id: 'member-1',
  userId: 'user-1',
  memberNumber: 'IKM-0001',
  fullName: 'Alice Doe',
  nationalId: null,
  address: null,
  joinedDate: new Date('2026-01-01'),
  createdAt: new Date('2026-01-01'),
  email: 'alice@example.com',
  phone: '+250788000001',
  status: 'ACTIVE',
};

// ── helpers ───────────────────────────────────────────────────────────────────

const mockPasswordHasher = {
  hash: vi.fn().mockResolvedValue('hashed'),
  verify: vi.fn(),
};

function makeService(
  memberRepo: MemberRepositoryInterface,
  userRepo: UserRepositoryInterface,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  auditLogSvc?: any,
) {
  const svc = new MemberService(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    memberRepo as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userRepo as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockPasswordHasher as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    {} as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    {} as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    {} as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    {} as any,
    auditLogSvc ?? {}
  );
  return svc;
}

// ── IKM-2.2: createMember ─────────────────────────────────────────────────────

describe('MemberService.createMember', () => {
  let memberRepo: ReturnType<typeof createMemberRepositoryMock>;
  let userRepo: ReturnType<typeof createUserRepositoryMock>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let auditLogSvc: any;
  let svc: MemberService;

  beforeEach(() => {
    memberRepo = createMemberRepositoryMock();
    userRepo = createUserRepositoryMock();
    auditLogSvc = { recordLog: vi.fn().mockResolvedValue(null) };
    svc = makeService(memberRepo, userRepo, auditLogSvc);
    vi.mocked(userRepo.create).mockResolvedValue(baseUser);
    vi.mocked(memberRepo.create).mockResolvedValue(baseMember);
  });

  it('creates user + member and returns the member', async () => {
    const result = await svc.createMember({
      email: 'alice@example.com',
      phone: '+250788000001',
      password: 'Secret123!',
      fullName: 'Alice Doe',
    });

    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'alice@example.com', role: 'MEMBER' }),
    );
    expect(memberRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', fullName: 'Alice Doe' }),
    );
    expect(result).toEqual(baseMember);
  });

  it('throws ConflictException when email is already taken by an active or suspended account', async () => {
    vi.mocked(userRepo.findByEmail).mockResolvedValue(baseUser);
    await expect(
      svc.createMember({
        email: 'alice@example.com',
        phone: '+250788000002',
        password: 'x',
        fullName: 'X',
      }),
    ).rejects.toThrow(ConflictException);
    expect(userRepo.create).not.toHaveBeenCalled();
  });

  it('throws ConflictException when phone is already taken by an active or suspended account', async () => {
    vi.mocked(userRepo.findByPhone).mockResolvedValue(baseUser);
    await expect(
      svc.createMember({
        email: 'new@example.com',
        phone: '+250788000001',
        password: 'x',
        fullName: 'X',
      }),
    ).rejects.toThrow(ConflictException);
    expect(userRepo.create).not.toHaveBeenCalled();
  });

  it('allows creation and logs MEMBER_REJOINED if existing account is EXITED', async () => {
    vi.mocked(userRepo.findByEmail).mockResolvedValue({ ...baseUser, status: 'EXITED', id: 'old-user-id' });
    vi.mocked(userRepo.create).mockResolvedValue({ ...baseUser, id: 'new-user-id', status: 'ACTIVE' });
    vi.mocked(memberRepo.create).mockResolvedValue({ ...baseMember, id: 'new-member-id', userId: 'new-user-id' });
    
    await svc.createMember({
      email: 'alice@example.com',
      phone: '+250788000001',
      password: 'x',
      fullName: 'X',
      adminUserId: 'admin-1',
    });
    
    expect(userRepo.create).toHaveBeenCalled();
    expect(auditLogSvc.recordLog).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'MEMBER_REJOINED',
      oldState: { oldUserId: 'old-user-id', oldStatus: 'EXITED' },
      newState: { newUserId: 'new-user-id', newStatus: 'ACTIVE' }
    }));
  });
});

// ── IKM-2.4: getMemberById ────────────────────────────────────────────────────

describe('MemberService.getMemberById', () => {
  it('returns the member when found', async () => {
    const memberRepo = createMemberRepositoryMock();
    const userRepo = createUserRepositoryMock();
    vi.mocked(memberRepo.findById).mockResolvedValue(baseMember);
    const svc = makeService(memberRepo, userRepo);
    await expect(svc.getMemberById('member-1')).resolves.toEqual(baseMember);
  });

  it('throws NotFoundException when not found', async () => {
    const svc = makeService(
      createMemberRepositoryMock(),
      createUserRepositoryMock(),
    );
    await expect(svc.getMemberById('bad-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});

// ── IKM-2.5: updateMember ─────────────────────────────────────────────────────

describe('MemberService.updateMember', () => {
  it('throws NotFoundException when member not found', async () => {
    const svc = makeService(
      createMemberRepositoryMock(),
      createUserRepositoryMock(),
    );
    await expect(svc.updateMember('bad-id', { fullName: 'X' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ConflictException on phone collision with another user', async () => {
    const memberRepo = createMemberRepositoryMock();
    const userRepo = createUserRepositoryMock();
    vi.mocked(memberRepo.findById).mockResolvedValue(baseMember);
    vi.mocked(userRepo.findByPhone).mockResolvedValue({
      ...baseUser,
      id: 'user-2',
    }); // different user
    const svc = makeService(memberRepo, userRepo);
    await expect(
      svc.updateMember('member-1', { phone: '+250788000002' }),
    ).rejects.toThrow(ConflictException);
  });

  it('does not conflict when phone belongs to the member itself', async () => {
    const memberRepo = createMemberRepositoryMock();
    const userRepo = createUserRepositoryMock();
    vi.mocked(memberRepo.findById).mockResolvedValue(baseMember);
    vi.mocked(userRepo.findByPhone).mockResolvedValue(baseUser); // same user
    vi.mocked(memberRepo.update).mockResolvedValue(baseMember);
    vi.mocked(memberRepo.findById).mockResolvedValue(baseMember);
    const svc = makeService(memberRepo, userRepo);
    await expect(
      svc.updateMember('member-1', { phone: '+250788000001' }),
    ).resolves.toEqual(baseMember);
  });
});

// ── IKM-2.6: updateMemberStatus ───────────────────────────────────────────────

describe('MemberService.updateMemberStatus', () => {
  let memberRepo: ReturnType<typeof createMemberRepositoryMock>;
  let userRepo: ReturnType<typeof createUserRepositoryMock>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let auditLogSvc: any;
  let svc: MemberService;

  beforeEach(() => {
    memberRepo = createMemberRepositoryMock();
    userRepo = createUserRepositoryMock();
    auditLogSvc = { recordLog: vi.fn().mockResolvedValue(null) };
    svc = makeService(memberRepo, userRepo, auditLogSvc);
  });

  it('suspends the member and logs MEMBER_STATUS_CHANGED', async () => {
    vi.mocked(memberRepo.findById).mockResolvedValue(baseMember);
    const result = await svc.updateMemberStatus('member-1', {
      status: 'SUSPENDED',
      reason: 'Missed payments',
      adminUserId: 'admin-1',
    });
    expect(userRepo.updateStatus).toHaveBeenCalledWith('user-1', 'SUSPENDED');
    expect(auditLogSvc.recordLog).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'MEMBER_STATUS_CHANGED',
      oldState: { status: 'ACTIVE' },
      newState: { status: 'SUSPENDED', reason: 'Missed payments' }
    }));
    expect(result).toEqual({ id: 'member-1', status: 'SUSPENDED' });
  });

  it('exits the member and logs MEMBER_STATUS_CHANGED', async () => {
    vi.mocked(memberRepo.findById).mockResolvedValue(baseMember);
    const result = await svc.updateMemberStatus('member-1', {
      status: 'EXITED',
      reason: 'Left org',
      adminUserId: 'admin-1',
    });
    expect(userRepo.updateStatus).toHaveBeenCalledWith('user-1', 'EXITED');
    expect(auditLogSvc.recordLog).toHaveBeenCalled();
    expect(result).toEqual({ id: 'member-1', status: 'EXITED' });
  });

  it('rejects EXITED to ACTIVE transition', async () => {
    vi.mocked(memberRepo.findById).mockResolvedValue({ ...baseMember, status: 'EXITED' });
    await expect(
      svc.updateMemberStatus('member-1', { status: 'ACTIVE' })
    ).rejects.toThrow(BadRequestException);
    expect(userRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('rejects EXITED to SUSPENDED transition', async () => {
    vi.mocked(memberRepo.findById).mockResolvedValue({ ...baseMember, status: 'EXITED' });
    await expect(
      svc.updateMemberStatus('member-1', { status: 'SUSPENDED', reason: 'x' })
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when reason is missing on suspend', async () => {
    vi.mocked(memberRepo.findById).mockResolvedValue(baseMember);
    await expect(
      svc.updateMemberStatus('member-1', { status: 'SUSPENDED' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('does not require reason when reactivating to ACTIVE', async () => {
    vi.mocked(memberRepo.findById).mockResolvedValue({
      ...baseMember,
      status: 'SUSPENDED',
    });
    await expect(
      svc.updateMemberStatus('member-1', { status: 'ACTIVE' }),
    ).resolves.toEqual({ id: 'member-1', status: 'ACTIVE' });
  });

  it('throws NotFoundException when member not found', async () => {
    await expect(
      svc.updateMemberStatus('bad-id', { status: 'SUSPENDED', reason: 'x' }),
    ).rejects.toThrow(NotFoundException);
  });
});

// ── IKM-2.7: getMyProfile ─────────────────────────────────────────────────────

describe('MemberService.getMyProfile', () => {
  it('returns the member for the given userId', async () => {
    const memberRepo = createMemberRepositoryMock();
    vi.mocked(memberRepo.findByUserId).mockResolvedValue(baseMember);
    const svc = makeService(memberRepo, createUserRepositoryMock());
    await expect(svc.getMyProfile('user-1')).resolves.toEqual(baseMember);
  });

  it('throws NotFoundException when no member linked to userId', async () => {
    const svc = makeService(
      createMemberRepositoryMock(),
      createUserRepositoryMock(),
    );
    await expect(svc.getMyProfile('ghost-user')).rejects.toThrow(
      NotFoundException,
    );
  });
});

// ── IKM-2.8: updateMyProfile ──────────────────────────────────────────────────

describe('MemberService.updateMyProfile', () => {
  it('throws NotFoundException when no member record exists', async () => {
    const svc = makeService(
      createMemberRepositoryMock(),
      createUserRepositoryMock(),
    );
    await expect(
      svc.updateMyProfile('ghost', { fullName: 'X' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException on phone collision with another user', async () => {
    const memberRepo = createMemberRepositoryMock();
    const userRepo = createUserRepositoryMock();
    vi.mocked(memberRepo.findByUserId).mockResolvedValue(baseMember);
    vi.mocked(userRepo.findByPhone).mockResolvedValue({
      ...baseUser,
      id: 'user-999',
    });
    const svc = makeService(memberRepo, userRepo);
    await expect(
      svc.updateMyProfile('user-1', { phone: '+250788000099' }),
    ).rejects.toThrow(ConflictException);
  });
});
