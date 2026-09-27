import { Inject, Injectable, Logger } from '@nestjs/common';
import { DATABASE_CONNECTION } from './database-connection.interface';
import type { IDatabaseConnection } from './database-connection.interface';
import type {
  PenaltyRepositoryInterface,
  CreatePenaltyParams,
  CreatePenaltyPaymentParams,
  ListPenaltiesFilter,
  ListPenaltiesResult,
  ListPenaltyPaymentsFilter,
  ListPenaltyPaymentsResult,
} from '../application/penalty/penalty.repository.interface';
import type { Penalty } from '../application/penalty/penalty';
import type {
  PenaltyPayment,
  PenaltyPaymentStatus,
} from '../application/penalty/penalty-payment';
import type { PenaltyStatus } from '../application/penalty/penalty-status';
import type { ContributionMethod } from '../application/payment/contribution-method';

interface PenaltyRow {
  id: string;
  member_id: string;
  monthly_obligation_id: string;
  amount: string;
  status: PenaltyStatus;
  created_at: string;
  updated_at: string;
  month?: number;
  year?: number;
  member_number?: string;
  full_name?: string;
}

interface PenaltyPaymentRow {
  id: string;
  penalty_id: string;
  amount: string;
  payment_date: string;
  method: ContributionMethod;
  reference: string | null;
  notes: string | null;
  proof_url: string;
  status: PenaltyPaymentStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  member_number?: string;
  full_name?: string;
}

function toPenaltyDomain(row: PenaltyRow): Penalty {
  return {
    id: row.id,
    memberId: row.member_id,
    monthlyObligationId: row.monthly_obligation_id,
    amount: parseFloat(row.amount),
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    month: row.month,
    year: row.year,
    memberNumber: row.member_number,
    memberName: row.full_name,
  };
}

function toPenaltyPaymentDomain(row: PenaltyPaymentRow): PenaltyPayment {
  return {
    id: row.id,
    penaltyId: row.penalty_id,
    amount: parseFloat(row.amount),
    paymentDate: new Date(row.payment_date),
    method: row.method,
    reference: row.reference || undefined,
    notes: row.notes || undefined,
    proofUrl: row.proof_url,
    status: row.status,
    rejectionReason: row.rejection_reason || undefined,
    reviewedBy: row.reviewed_by || undefined,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
    createdAt: new Date(row.created_at),
    memberNumber: row.member_number,
    memberName: row.full_name,
  };
}

@Injectable()
export class PenaltyRepository implements PenaltyRepositoryInterface {
  private readonly logger = new Logger(PenaltyRepository.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: IDatabaseConnection,
  ) {}

  async createPenalty(params: CreatePenaltyParams): Promise<Penalty> {
    const rows = await this.db.query<PenaltyRow>(
      `INSERT INTO penalties
       (member_id, monthly_obligation_id, amount, status)
       VALUES ($1, $2, $3, 'UNPAID')
       RETURNING *`,
      [params.memberId, params.monthlyObligationId, params.amount],
    );
    return toPenaltyDomain(rows[0]);
  }

  async findPenaltyById(id: string): Promise<Penalty | null> {
    const rows = await this.db.query<PenaltyRow>(
      `SELECT p.*, mo.month, mo.year, m.member_number, m.full_name
       FROM penalties p
       JOIN monthly_obligations mo ON p.monthly_obligation_id = mo.id
       JOIN members m ON p.member_id = m.id
       WHERE p.id = $1`,
      [id],
    );
    if (!rows[0]) return null;
    return toPenaltyDomain(rows[0]);
  }

  async findPenaltyByObligationId(
    obligationId: string,
  ): Promise<Penalty | null> {
    const rows = await this.db.query<PenaltyRow>(
      `SELECT p.*, mo.month, mo.year, m.member_number, m.full_name
       FROM penalties p
       JOIN monthly_obligations mo ON p.monthly_obligation_id = mo.id
       JOIN members m ON p.member_id = m.id
       WHERE p.monthly_obligation_id = $1`,
      [obligationId],
    );
    if (!rows[0]) return null;
    return toPenaltyDomain(rows[0]);
  }

  async listPenalties(
    filter: ListPenaltiesFilter,
  ): Promise<ListPenaltiesResult> {
    const { page, limit, status, memberId } = filter;
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (status) {
      params.push(status);
      conditions.push(`p.status = $${params.length}`);
    }
    if (memberId) {
      params.push(memberId);
      conditions.push(`p.member_id = $${params.length}`);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM penalties p ${where}`,
      params,
    );
    const total = parseInt(countRows[0].count, 10);

    params.push(limit, offset);
    const rows = await this.db.query<PenaltyRow>(
      `SELECT p.*, mo.month, mo.year, m.member_number, m.full_name
       FROM penalties p
       JOIN monthly_obligations mo ON p.monthly_obligation_id = mo.id
       JOIN members m ON p.member_id = m.id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return {
      items: rows.map(toPenaltyDomain),
      page,
      limit,
      total,
    };
  }

  async updatePenaltyStatus(
    id: string,
    status: PenaltyStatus,
  ): Promise<Penalty | null> {
    const rows = await this.db.query<PenaltyRow>(
      `UPDATE penalties
       SET status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status],
    );

    if (!rows[0]) return null;
    return this.findPenaltyById(id);
  }

  async createPenaltyPayment(
    params: CreatePenaltyPaymentParams,
  ): Promise<PenaltyPayment> {
    const rows = await this.db.query<PenaltyPaymentRow>(
      `INSERT INTO penalty_payments
       (penalty_id, amount, payment_date, method, reference, notes, proof_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
       RETURNING *`,
      [
        params.penaltyId,
        params.amount,
        params.paymentDate,
        params.method,
        params.reference || null,
        params.notes || null,
        params.proofUrl,
      ],
    );
    return toPenaltyPaymentDomain(rows[0]);
  }

  async findPenaltyPaymentById(id: string): Promise<PenaltyPayment | null> {
    const rows = await this.db.query<PenaltyPaymentRow>(
      `SELECT pp.*, m.member_number, m.full_name
       FROM penalty_payments pp
       JOIN penalties p ON pp.penalty_id = p.id
       JOIN members m ON p.member_id = m.id
       WHERE pp.id = $1`,
      [id],
    );
    if (!rows[0]) return null;
    return toPenaltyPaymentDomain(rows[0]);
  }

  async listPenaltyPayments(
    filter: ListPenaltyPaymentsFilter,
  ): Promise<ListPenaltyPaymentsResult> {
    const { page, limit, status, memberId } = filter;
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (status) {
      params.push(status);
      conditions.push(`pp.status = $${params.length}`);
    }
    if (memberId) {
      params.push(memberId);
      conditions.push(`p.member_id = $${params.length}`);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM penalty_payments pp
       JOIN penalties p ON pp.penalty_id = p.id
       ${where}`,
      params,
    );
    const total = parseInt(countRows[0].count, 10);

    params.push(limit, offset);
    const rows = await this.db.query<PenaltyPaymentRow>(
      `SELECT pp.*, m.member_number, m.full_name
       FROM penalty_payments pp
       JOIN penalties p ON pp.penalty_id = p.id
       JOIN members m ON p.member_id = m.id
       ${where}
       ORDER BY pp.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return {
      items: rows.map(toPenaltyPaymentDomain),
      page,
      limit,
      total,
    };
  }

  async approvePenaltyPaymentAndMarkPaid(
    id: string,
    reviewedBy: string,
  ): Promise<PenaltyPayment | null> {
    return this.db.transaction(async (query) => {
      const paymentRows = await query<PenaltyPaymentRow>(
        `UPDATE penalty_payments
         SET status = 'APPROVED', reviewed_by = $2, reviewed_at = NOW()
         WHERE id = $1 AND status = 'PENDING'
         RETURNING *`,
        [id, reviewedBy],
      );

      if (!paymentRows[0]) return null;

      const payment = paymentRows[0];

      await query(
        `UPDATE penalties
         SET status = 'PAID', updated_at = NOW()
         WHERE id = $1`,
        [payment.penalty_id],
      );

      await query(
        `INSERT INTO audit_logs (admin_user_id, action_type, entity_name, entity_id, old_state, new_state)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          reviewedBy,
          'APPROVE_PENALTY_PAYMENT',
          'penalty_payments',
          id,
          JSON.stringify({ status: 'PENDING' }),
          JSON.stringify({ status: 'APPROVED' }),
        ],
      );

      const rows = await query<PenaltyPaymentRow>(
        `SELECT pp.*, m.member_number, m.full_name
         FROM penalty_payments pp
         JOIN penalties p ON pp.penalty_id = p.id
         JOIN members m ON p.member_id = m.id
         WHERE pp.id = $1`,
        [id],
      );

      return toPenaltyPaymentDomain(rows[0]);
    });
  }

  async rejectPenaltyPayment(
    id: string,
    rejectionReason: string,
    reviewedBy: string,
  ): Promise<PenaltyPayment | null> {
    return this.db.transaction(async (query) => {
      const paymentRows = await query<PenaltyPaymentRow>(
        `UPDATE penalty_payments
         SET status = 'REJECTED', rejection_reason = $2, reviewed_by = $3, reviewed_at = NOW()
         WHERE id = $1 AND status = 'PENDING'
         RETURNING *`,
        [id, rejectionReason, reviewedBy],
      );

      if (!paymentRows[0]) return null;

      const payment = paymentRows[0];

      // Mark the penalty back to UNPAID
      await query(
        `UPDATE penalties
         SET status = 'UNPAID', updated_at = NOW()
         WHERE id = $1`,
        [payment.penalty_id],
      );

      const rows = await query<PenaltyPaymentRow>(
        `SELECT pp.*, m.member_number, m.full_name
         FROM penalty_payments pp
         JOIN penalties p ON pp.penalty_id = p.id
         JOIN members m ON p.member_id = m.id
         WHERE pp.id = $1`,
        [id],
      );

      return toPenaltyPaymentDomain(rows[0]);
    });
  }
  async getUnpaidAmountsForMembers(
    memberIds: string[],
  ): Promise<Map<string, number>> {
    if (memberIds.length === 0) return new Map();

    const rows = await this.db.query<{ member_id: string; total: string }>(
      `SELECT member_id, SUM(amount) as total FROM penalties WHERE member_id = ANY($1) AND status = 'UNPAID' GROUP BY member_id`,
      [memberIds],
    );

    const amounts = new Map<string, number>();
    for (const row of rows) {
      amounts.set(row.member_id, parseFloat(row.total));
    }
    return amounts;
  }

  async getLastApprovedPaymentDatesForMembers(
    memberIds: string[],
  ): Promise<Map<string, Date>> {
    if (memberIds.length === 0) return new Map();

    const rows = await this.db.query<{ member_id: string; max_date: string }>(
      `SELECT p.member_id, MAX(pp.payment_date) as max_date 
       FROM penalty_payments pp 
       JOIN penalties p ON pp.penalty_id = p.id 
       WHERE p.member_id = ANY($1) AND pp.status = 'APPROVED' 
       GROUP BY p.member_id`,
      [memberIds],
    );

    const dates = new Map<string, Date>();
    for (const row of rows) {
      dates.set(row.member_id, new Date(row.max_date));
    }
    return dates;
  }
}
