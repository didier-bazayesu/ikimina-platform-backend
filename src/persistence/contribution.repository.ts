import { Inject, Injectable, Logger } from '@nestjs/common';
import { DATABASE_CONNECTION } from './database-connection.interface';
import type { IDatabaseConnection } from './database-connection.interface';
import type {
  ContributionRepositoryInterface,
  CreatePaymentParams,
  ListPaymentsFilter,
  ListPaymentsResult,
} from '../application/payment/contribution.repository.interface';
import type { ContributionPayment } from '../application/payment/contribution-payment';
import type { ContributionAllocation } from '../application/payment/contribution-allocation';
import type { ContributionStatus } from '../application/payment/contribution-status';
import type { ContributionMethod } from '../application/payment/contribution-method';

interface PaymentRow {
  id: string;
  member_id: string;
  amount: string;
  payment_date: string;
  method: ContributionMethod;
  reference: string | null;
  notes: string | null;
  proof_url: string;
  status: ContributionStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  member_number?: string;
  full_name?: string;
}

interface AllocationRow {
  id: string;
  contribution_payment_id: string;
  monthly_obligation_id: string;
  amount: string;
  created_at: string;
  month?: number;
  year?: number;
}

function toPaymentDomain(
  row: PaymentRow,
  allocations: ContributionAllocation[] = [],
): ContributionPayment {
  return {
    id: row.id,
    memberId: row.member_id,
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
    allocations,
    memberNumber: row.member_number || undefined,
    memberName: row.full_name || undefined,
  };
}

function toAllocationDomain(row: AllocationRow): ContributionAllocation {
  return {
    id: row.id,
    contributionPaymentId: row.contribution_payment_id,
    monthlyObligationId: row.monthly_obligation_id,
    amount: parseFloat(row.amount),
    createdAt: new Date(row.created_at),
    month: row.month,
    year: row.year,
  };
}

@Injectable()
export class ContributionRepository implements ContributionRepositoryInterface {
  private readonly logger = new Logger(ContributionRepository.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: IDatabaseConnection,
  ) {}

  async createPaymentWithAllocations(
    params: CreatePaymentParams,
  ): Promise<ContributionPayment> {
    return this.db.transaction(async (query) => {
      const paymentRows = await query<PaymentRow>(
        `INSERT INTO contribution_payments
         (member_id, amount, payment_date, method, reference, notes, proof_url, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
         RETURNING *`,
        [
          params.memberId,
          params.amount,
          params.paymentDate,
          params.method,
          params.reference || null,
          params.notes || null,
          params.proofUrl,
        ],
      );

      const paymentRow = paymentRows[0];
      const createdAllocations: ContributionAllocation[] = [];

      for (const alloc of params.allocations) {
        const allocRows = await query<AllocationRow>(
          `INSERT INTO contribution_allocations
           (contribution_payment_id, monthly_obligation_id, amount)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [paymentRow.id, alloc.monthlyObligationId, alloc.amount],
        );
        createdAllocations.push(toAllocationDomain(allocRows[0]));
      }

      return toPaymentDomain(paymentRow, createdAllocations);
    });
  }

  async findById(id: string): Promise<ContributionPayment | null> {
    const paymentRows = await this.db.query<PaymentRow>(
      `SELECT cp.*, m.member_number, m.full_name
       FROM contribution_payments cp
       JOIN members m ON cp.member_id = m.id
       WHERE cp.id = $1`,
      [id],
    );

    if (!paymentRows[0]) return null;

    const allocRows = await this.db.query<AllocationRow>(
      `SELECT ca.*, mo.month, mo.year
       FROM contribution_allocations ca
       JOIN monthly_obligations mo ON ca.monthly_obligation_id = mo.id
       WHERE ca.contribution_payment_id = $1`,
      [id],
    );

    const allocations = allocRows.map(toAllocationDomain);
    return toPaymentDomain(paymentRows[0], allocations);
  }

  async list(filter: ListPaymentsFilter): Promise<ListPaymentsResult> {
    const { page, limit, status, memberId } = filter;
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (status) {
      params.push(status);
      conditions.push(`cp.status = $${params.length}`);
    }
    if (memberId) {
      params.push(memberId);
      conditions.push(`cp.member_id = $${params.length}`);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM contribution_payments cp ${where}`,
      params,
    );
    const total = parseInt(countRows[0].count, 10);

    params.push(limit, offset);
    const paymentRows = await this.db.query<PaymentRow>(
      `SELECT cp.*, m.member_number, m.full_name
       FROM contribution_payments cp
       JOIN members m ON cp.member_id = m.id
       ${where}
       ORDER BY cp.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const items: ContributionPayment[] = [];
    for (const row of paymentRows) {
      const allocRows = await this.db.query<AllocationRow>(
        `SELECT ca.*, mo.month, mo.year
         FROM contribution_allocations ca
         JOIN monthly_obligations mo ON ca.monthly_obligation_id = mo.id
         WHERE ca.contribution_payment_id = $1`,
        [row.id],
      );
      items.push(toPaymentDomain(row, allocRows.map(toAllocationDomain)));
    }

    return { items, page, limit, total };
  }

  async findPendingOrApprovedAllocationForObligation(
    obligationId: string,
  ): Promise<ContributionAllocation | null> {
    const rows = await this.db.query<AllocationRow>(
      `SELECT ca.*, mo.month, mo.year
       FROM contribution_allocations ca
       JOIN contribution_payments cp ON ca.contribution_payment_id = cp.id
       JOIN monthly_obligations mo ON ca.monthly_obligation_id = mo.id
       WHERE ca.monthly_obligation_id = $1
         AND cp.status IN ('PENDING', 'APPROVED')
       LIMIT 1`,
      [obligationId],
    );

    return rows[0] ? toAllocationDomain(rows[0]) : null;
  }

  async approveAndMarkObligationsPaid(
    id: string,
    reviewedBy: string,
  ): Promise<ContributionPayment | null> {
    return this.db.transaction(async (query) => {
      const rows = await query<PaymentRow>(
        `UPDATE contribution_payments
         SET status = 'APPROVED', reviewed_by = $2, reviewed_at = NOW()
         WHERE id = $1 AND status = 'PENDING'
         RETURNING *`,
        [id, reviewedBy],
      );

      if (!rows[0]) return null;

      // Mark every allocated obligation as PAID within the same transaction
      const allocRows = await query<AllocationRow>(
        `SELECT * FROM contribution_allocations WHERE contribution_payment_id = $1`,
        [id],
      );

      for (const alloc of allocRows) {
        await query(
          `UPDATE monthly_obligations SET status = 'PAID' WHERE id = $1`,
          [alloc.monthly_obligation_id],
        );
      }

      await query(
        `INSERT INTO audit_logs (admin_user_id, action_type, entity_name, entity_id, old_state, new_state)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          reviewedBy,
          'APPROVE_CONTRIBUTION',
          'contribution_payments',
          id,
          JSON.stringify({ status: 'PENDING' }),
          JSON.stringify({ status: 'APPROVED' }),
        ],
      );

      // Re-fetch the full payment with allocations and member info
      const paymentRows = await query<PaymentRow>(
        `SELECT cp.*, m.member_number, m.full_name
         FROM contribution_payments cp
         JOIN members m ON cp.member_id = m.id
         WHERE cp.id = $1`,
        [id],
      );

      const allocationRows = await query<AllocationRow>(
        `SELECT ca.*, mo.month, mo.year
         FROM contribution_allocations ca
         JOIN monthly_obligations mo ON ca.monthly_obligation_id = mo.id
         WHERE ca.contribution_payment_id = $1`,
        [id],
      );

      return toPaymentDomain(
        paymentRows[0],
        allocationRows.map(toAllocationDomain),
      );
    });
  }

  async markRejected(
    id: string,
    rejectionReason: string,
    reviewedBy: string,
  ): Promise<ContributionPayment | null> {
    const rows = await this.db.query<PaymentRow>(
      `UPDATE contribution_payments
       SET status = 'REJECTED', rejection_reason = $2, reviewed_by = $3, reviewed_at = NOW()
       WHERE id = $1 AND status = 'PENDING'
       RETURNING *`,
      [id, rejectionReason, reviewedBy],
    );

    if (!rows[0]) return null;

    return this.findById(id);
  }
}
