import type {
  ContributionRepositoryInterface,
  CreatePaymentParams,
  ListPaymentsFilter,
  ListPaymentsResult,
} from './contribution.repository.interface';
import type { ContributionPayment } from './contribution-payment';
import type { ContributionAllocation } from './contribution-allocation';

export class ContributionRepositoryMock implements ContributionRepositoryInterface {
  public payments: ContributionPayment[] = [];
  public allocations: ContributionAllocation[] = [];

  async createPaymentWithAllocations(
    params: CreatePaymentParams,
  ): Promise<ContributionPayment> {
    const paymentId = `pay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const createdAllocations: ContributionAllocation[] = params.allocations.map(
      (a) => {
        const alloc: ContributionAllocation = {
          id: `alloc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          contributionPaymentId: paymentId,
          monthlyObligationId: a.monthlyObligationId,
          amount: a.amount,
          createdAt: new Date(),
        };
        this.allocations.push(alloc);
        return alloc;
      },
    );

    const payment: ContributionPayment = {
      id: paymentId,
      memberId: params.memberId,
      amount: params.amount,
      paymentDate: params.paymentDate,
      method: params.method,
      reference: params.reference,
      notes: params.notes,
      proofUrl: params.proofUrl,
      status: 'PENDING',
      createdAt: new Date(),
      allocations: createdAllocations,
    };

    this.payments.push(payment);
    return payment;
  }

  async findById(id: string): Promise<ContributionPayment | null> {
    const found = this.payments.find((p) => p.id === id);
    if (!found) return null;
    const paymentAllocations = this.allocations.filter(
      (a) => a.contributionPaymentId === id,
    );
    return { ...found, allocations: paymentAllocations };
  }

  async list(filter: ListPaymentsFilter): Promise<ListPaymentsResult> {
    let items = [...this.payments];

    if (filter.status) {
      items = items.filter((p) => p.status === filter.status);
    }
    if (filter.memberId) {
      items = items.filter((p) => p.memberId === filter.memberId);
    }

    const total = items.length;
    const offset = (filter.page - 1) * filter.limit;
    const paginated = items.slice(offset, offset + filter.limit).map((p) => {
      const paymentAllocations = this.allocations.filter(
        (a) => a.contributionPaymentId === p.id,
      );
      return { ...p, allocations: paymentAllocations };
    });

    return {
      items: paginated,
      page: filter.page,
      limit: filter.limit,
      total,
    };
  }

  async findPendingOrApprovedAllocationForObligation(
    obligationId: string,
  ): Promise<ContributionAllocation | null> {
    const alloc = this.allocations.find((a) => {
      if (a.monthlyObligationId !== obligationId) return false;
      const payment = this.payments.find(
        (p) => p.id === a.contributionPaymentId,
      );
      return (
        payment &&
        (payment.status === 'PENDING' || payment.status === 'APPROVED')
      );
    });

    return alloc || null;
  }

  async approveAndMarkObligationsPaid(
    id: string,
    reviewedBy: string,
  ): Promise<ContributionPayment | null> {
    const payment = this.payments.find((p) => p.id === id);
    if (!payment) return null;

    payment.status = 'APPROVED';
    payment.reviewedBy = reviewedBy;
    payment.reviewedAt = new Date();

    const paymentAllocations = this.allocations.filter(
      (a) => a.contributionPaymentId === id,
    );
    return { ...payment, allocations: paymentAllocations };
  }

  async markRejected(
    id: string,
    rejectionReason: string,
    reviewedBy: string,
  ): Promise<ContributionPayment | null> {
    const payment = this.payments.find((p) => p.id === id);
    if (!payment) return null;

    payment.status = 'REJECTED';
    payment.rejectionReason = rejectionReason;
    payment.reviewedBy = reviewedBy;
    payment.reviewedAt = new Date();

    const paymentAllocations = this.allocations.filter(
      (a) => a.contributionPaymentId === id,
    );
    return { ...payment, allocations: paymentAllocations };
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getApprovedTotalsForMembers(_memberIds: string[]): Promise<Map<string, number>> {
    return new Map();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getLastApprovedPaymentDatesForMembers(_memberIds: string[]): Promise<Map<string, Date>> {
    return new Map();
  }
}
