import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from './database-connection.interface';
import type { IDatabaseConnection } from './database-connection.interface';
import type {
  MemberRepositoryInterface,
  CreateMemberInput,
  UpdateMemberInput,
  ListMembersFilter,
  ListMembersResult,
} from '../application/member/member.repository.interface';
import { MEMBER_REPOSITORY } from '../application/member/member.repository.interface';
import type { Member } from '../application/member/member';
import type { UserStatus } from '../application/authentication/user';

interface MemberRow {
  id: string;
  user_id: string;
  member_number: string;
  full_name: string;
  national_id: string | null;
  address: string | null;
  joined_date: string;
  created_at: string;
  // joined from users
  email: string;
  phone: string;
  status: UserStatus;
}

function toDomain(row: MemberRow): Member {
  return {
    id: row.id,
    userId: row.user_id,
    memberNumber: row.member_number,
    fullName: row.full_name,
    nationalId: row.national_id,
    address: row.address,
    joinedDate: new Date(row.joined_date),
    createdAt: new Date(row.created_at),
    email: row.email,
    phone: row.phone,
    status: row.status,
  };
}

// Shared JOIN fragment — every read joins users for status/email/phone
const SELECT_WITH_USER = `
  SELECT
    m.id, m.user_id, m.member_number, m.full_name,
    m.national_id, m.address, m.joined_date, m.created_at,
    u.email, u.phone, u.status
  FROM members m
  JOIN users u ON u.id = m.user_id
`;

@Injectable()
export class MemberRepository implements MemberRepositoryInterface {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: IDatabaseConnection,
  ) {}

  async create(input: CreateMemberInput): Promise<Member> {
    const rows = await this.db.query<MemberRow>(
      `INSERT INTO members (user_id, member_number, full_name, national_id, address, joined_date)
       VALUES (
         $1,
         'IKM-' || LPAD(nextval('member_number_seq')::text, 4, '0'),
         $2, $3, $4,
         COALESCE($5::date, CURRENT_DATE)
       )
       RETURNING id`,
      [
        input.userId,
        input.fullName,
        input.nationalId ?? null,
        input.address ?? null,
        input.joinedDate ?? null,
      ],
    );

    // Re-fetch with join so all fields are populated
    return (await this.findById(rows[0].id))!;
  }

  async findById(id: string): Promise<Member | null> {
    const rows = await this.db.query<MemberRow>(
      `${SELECT_WITH_USER} WHERE m.id = $1`,
      [id],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findByUserId(userId: string): Promise<Member | null> {
    const rows = await this.db.query<MemberRow>(
      `${SELECT_WITH_USER} WHERE m.user_id = $1`,
      [userId],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findByMemberNumber(memberNumber: string): Promise<Member | null> {
    const rows = await this.db.query<MemberRow>(
      `${SELECT_WITH_USER} WHERE m.member_number = $1`,
      [memberNumber],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async list(filter: ListMembersFilter): Promise<ListMembersResult> {
    const { page, limit, status, search } = filter;
    const offset = (page - 1) * limit;
    const params: unknown[] = [];

    const conditions: string[] = [];

    if (status) {
      params.push(status);
      conditions.push(`u.status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      conditions.push(
        `(m.full_name ILIKE $${idx} OR u.email ILIKE $${idx} OR m.member_number ILIKE $${idx})`,
      );
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total matching rows
    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM members m JOIN users u ON u.id = m.user_id ${where}`,
      params,
    );
    const total = parseInt(countRows[0].count, 10);

    params.push(limit, offset);
    const rows = await this.db.query<MemberRow>(
      `${SELECT_WITH_USER}
       ${where}
       ORDER BY m.member_number ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { items: rows.map(toDomain), page, limit, total };
  }

  async update(id: string, input: UpdateMemberInput): Promise<Member | null> {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (input.fullName !== undefined) {
      params.push(input.fullName);
      sets.push(`full_name = $${params.length}`);
    }
    if (input.address !== undefined) {
      params.push(input.address);
      sets.push(`address = $${params.length}`);
    }
    if (input.nationalId !== undefined) {
      params.push(input.nationalId);
      sets.push(`national_id = $${params.length}`);
    }

    if (sets.length === 0) return this.findById(id);

    params.push(id);
    await this.db.query(
      `UPDATE members SET ${sets.join(', ')} WHERE id = $${params.length}`,
      params,
    );

    return this.findById(id);
  }
}

export { MEMBER_REPOSITORY };
