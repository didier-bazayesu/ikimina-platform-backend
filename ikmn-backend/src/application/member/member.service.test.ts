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
) {
  const svc = new MemberService(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    memberRepo as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userRepo as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockPasswordHasher as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any
  );
  return svc;
}

// ── IKM-2.2: createMember ─────────────────────────────────────────────────────

describe('MemberService.createMember', () => {
  let memberRepo: ReturnType<typeof createMemberRepositoryMock>;
  let userRepo: ReturnType<typeof createUserRepositoryMock>;
  let svc: MemberService;

  beforeEach(() => {
    memberRepo = createMemberRepositoryMock();
    userRepo = createUserRepositoryMock();
    svc = makeService(memberRepo, userRepo);
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

  it('throws ConflictException when email is already taken', async () => {
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

  it('throws ConflictException when phone is already taken', async () => {
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
  it('suspends the member (updates users.status)', async () => {
    const memberRepo = createMemberRepositoryMock();
    const userRepo = createUserRepositoryMock();
    vi.mocked(memberRepo.findById).mockResolvedValue(baseMember);
    const svc = makeService(memberRepo, userRepo);
    const result = await svc.updateMemberStatus('member-1', {
      status: 'SUSPENDED',
      reason: 'Missed payments',
    });
    expect(userRepo.updateStatus).toHaveBeenCalledWith('user-1', 'SUSPENDED');
    expect(result).toEqual({ id: 'member-1', status: 'SUSPENDED' });
  });

  it('throws BadRequestException when reason is missing on suspend', async () => {
    const memberRepo = createMemberRepositoryMock();
    const userRepo = createUserRepositoryMock();
    vi.mocked(memberRepo.findById).mockResolvedValue(baseMember);
    const svc = makeService(memberRepo, userRepo);
    await expect(
      svc.updateMemberStatus('member-1', { status: 'SUSPENDED' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when reason is missing on exit', async () => {
    const memberRepo = createMemberRepositoryMock();
    const userRepo = createUserRepositoryMock();
    vi.mocked(memberRepo.findById).mockResolvedValue(baseMember);
    const svc = makeService(memberRepo, userRepo);
    await expect(
      svc.updateMemberStatus('member-1', { status: 'EXITED' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('does not require reason when reactivating to ACTIVE', async () => {
    const memberRepo = createMemberRepositoryMock();
    const userRepo = createUserRepositoryMock();
    vi.mocked(memberRepo.findById).mockResolvedValue({
      ...baseMember,
      status: 'SUSPENDED',
    });
    const svc = makeService(memberRepo, userRepo);
    await expect(
      svc.updateMemberStatus('member-1', { status: 'ACTIVE' }),
    ).resolves.toEqual({ id: 'member-1', status: 'ACTIVE' });
  });

  it('throws NotFoundException when member not found', async () => {
    const svc = makeService(
      createMemberRepositoryMock(),
      createUserRepositoryMock(),
    );
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
