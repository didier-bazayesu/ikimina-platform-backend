import {
  Inject,
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import type {
  ContributionServiceInterface,
  SubmitContributionPaymentParams,
  ListContributionPaymentsParams,
  ListContributionPaymentsResponse,
  RecordOnBehalfParams,
} from './contribution.service.interface';
import type { ContributionRepositoryInterface } from './contribution.repository.interface';
import { CONTRIBUTION_REPOSITORY } from './contribution.repository.interface';
import type { MonthlyObligationRepositoryInterface } from '../monthly-obligation/monthly-obligation.repository.interface';
import { MONTHLY_OBLIGATION_REPOSITORY } from '../monthly-obligation/monthly-obligation.repository.interface';
import type { StorageAdapterInterface } from '../common/storage.interface';
import { STORAGE_ADAPTER } from '../common/storage.interface';
import type { ContributionPayment } from './contribution-payment';
import type { MonthlyObligation } from '../monthly-obligation/monthly-obligation';
import type { PenaltyRepositoryInterface } from '../penalty/penalty.repository.interface';
import { PENALTY_REPOSITORY } from '../penalty/penalty.repository.interface';
import type { PenaltyPayment } from '../penalty/penalty-payment';

import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ContributionService implements ContributionServiceInterface {
  private readonly logger = new Logger(ContributionService.name);

  constructor(
    @Inject(CONTRIBUTION_REPOSITORY)
    private readonly repository: ContributionRepositoryInterface,
    @Inject(MONTHLY_OBLIGATION_REPOSITORY)
    private readonly obligationRepo: MonthlyObligationRepositoryInterface,
    @Inject(STORAGE_ADAPTER)
    private readonly storageAdapter: StorageAdapterInterface,
    private readonly eventEmitter: EventEmitter2,
    @Inject(PENALTY_REPOSITORY)
    private readonly penaltyRepo: PenaltyRepositoryInterface,
  ) {}

  async submitPayment(
    params: SubmitContributionPaymentParams,
  ): Promise<ContributionPayment> {
    if (!params.obligationIds || params.obligationIds.length === 0) {
      throw new BadRequestException(
        'At least one obligationId must be provided',
      );
    }

    if (!params.paymentDate || isNaN(params.paymentDate.getTime())) {
      throw new BadRequestException('Invalid payment date');
    }

    if (params.paymentDate > new Date()) {
      throw new BadRequestException('Payment date cannot be in the future');
    }

    if (
      (params.method === 'MOMO' || params.method === 'BANK') &&
      (!params.reference || !params.reference.trim())
    ) {
      throw new BadRequestException(
        `Reference is required for payment method ${params.method}`,
      );
    }

    if (!params.proofUrl && !params.file) {
      throw new BadRequestException('Proof file or proofUrl is required');
    }

    if (params.file) {
      const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
      ];
      if (
        params.file.mimetype &&
        !allowedMimeTypes.includes(params.file.mimetype)
      ) {
        throw new BadRequestException(
          'Proof file must be an image (JPEG, PNG, WEBP) or PDF',
        );
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (params.file.buffer && params.file.buffer.length > maxSize) {
        throw new BadRequestException('Proof file size must not exceed 10MB');
      }
    }

    // Fetch and validate targeted obligations
    const obligations: MonthlyObligation[] = [];
    for (const obId of params.obligationIds) {
      const ob = await this.obligationRepo.list({ page: 1, limit: 10000 });
      const found = ob.items.find((item) => item.id === obId);

      if (!found) {
        throw new NotFoundException(`Obligation ${obId} not found`);
      }
      if (found.memberId !== params.memberId) {
        throw new NotFoundException(
          `Obligation ${obId} does not belong to the caller`,
        );
      }
      if (found.status !== 'UNPAID') {
        throw new BadRequestException(`Obligation ${obId} is already paid`);
      }

      obligations.push(found);
    }

    // Verify same currency
    const firstCurrency = obligations[0].currency;
    const mixedCurrency = obligations.some(
      (ob) => ob.currency !== firstCurrency,
    );
    if (mixedCurrency) {
      throw new BadRequestException(
        'Targeted obligations span more than one currency',
      );
    }

    // Verify exact amount sum
    const totalExpected = obligations.reduce(
      (sum, ob) => sum + ob.expectedAmount,
      0,
    );
    if (Math.abs(params.amount - totalExpected) > 0.01) {
      throw new BadRequestException(
        `Submitted amount (${params.amount}) does not match total expected amount (${totalExpected})`,
      );
    }

    // Check existing pending/approved allocations
    for (const ob of obligations) {
      const existingAlloc =
        await this.repository.findPendingOrApprovedAllocationForObligation(
          ob.id,
        );
      if (existingAlloc) {
        throw new ConflictException(
          `Obligation ${ob.id} already has a PENDING or APPROVED allocation`,
        );
      }
    }

    // Upload proof file or use provided proofUrl
    let proofUrl = params.proofUrl;
    if (!proofUrl && params.file) {
      proofUrl = await this.storageAdapter.upload(params.file);
    }

    // Create payment with allocations (repository handles the transaction internally)
    const allocations = obligations.map((ob) => ({
      monthlyObligationId: ob.id,
      amount: ob.expectedAmount,
    }));

    return this.repository.createPaymentWithAllocations({
      memberId: params.memberId,
      amount: params.amount,
      paymentDate: params.paymentDate,
      method: params.method,
      reference: params.reference,
      notes: params.notes,
      proofUrl: proofUrl!,
      allocations,
    });
  }

  async listPayments(
    params: ListContributionPaymentsParams,
  ): Promise<ListContributionPaymentsResponse> {
    const page = Math.max(params.page ?? 1, 1);
    const limit = Math.min(params.limit ?? 20, 100);

    const result = await this.repository.list({
      status: params.status,
      memberId: params.memberId,
      page,
      limit,
    });

    return {
      items: result.items,
      page,
      limit,
      total: result.total,
    };
  }

  async getMyPayments(
    memberId: string,
    params: ListContributionPaymentsParams,
  ): Promise<ListContributionPaymentsResponse> {
    return this.listPayments({ ...params, memberId });
  }

  async approvePayment(
    id: string,
    adminUserId: string,
  ): Promise<ContributionPayment> {
    const payment = await this.repository.findById(id);
    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }

    if (payment.status !== 'PENDING') {
      throw new ConflictException(`Payment ${id} is not currently PENDING`);
    }

    // Repository handles the full atomic operation: approve + mark obligations PAID
    const approvedPayment = await this.repository.approveAndMarkObligationsPaid(
      id,
      adminUserId,
    );

    if (!approvedPayment) {
      throw new ConflictException(`Failed to approve payment ${id}`);
    }

    this.eventEmitter.emit('payment.approved', {
      memberId: approvedPayment.memberId,
      amount: approvedPayment.amount,
    });

    return approvedPayment;
  }

  async rejectPayment(
    id: string,
    reason: string,
    adminUserId: string,
  ): Promise<ContributionPayment> {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }

    const payment = await this.repository.findById(id);
    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }

    if (payment.status !== 'PENDING') {
      throw new ConflictException(`Payment ${id} is not currently PENDING`);
    }

    const rejectedPayment = await this.repository.markRejected(
      id,
      reason.trim(),
      adminUserId,
    );

    if (!rejectedPayment) {
      throw new ConflictException(`Failed to reject payment ${id}`);
    }

    return rejectedPayment;
  }

  async flagPayment(
    id: string,
    reason: string,
    message: string,
    adminUserId: string,
  ): Promise<ContributionPayment> {
    const payment = await this.repository.findById(id);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.status !== 'PENDING') {
      throw new BadRequestException('Only pending payments can be flagged');
    }

    // Emit event to trigger notification without changing payment status
    this.eventEmitter.emit('payment.flagged', {
      memberId: payment.memberId,
      reason,
      message,
    });

    this.logger.log(`Payment ${id} flagged by admin ${adminUserId} with reason: ${reason}`);
    return payment;
  }

  async recordOnBehalf(
    params: RecordOnBehalfParams,
    adminUserId: string,
  ): Promise<{ contributionPayment: ContributionPayment; penaltyPayments: PenaltyPayment[] }> {
    if (!params.obligationIds || params.obligationIds.length === 0) {
      throw new BadRequestException('At least one obligation ID must be provided');
    }

    const obligations: MonthlyObligation[] = [];
    // Fetch and validate targeted obligations
    const allObligations = await this.obligationRepo.list({ page: 1, limit: 10000 });
    
    for (const id of params.obligationIds) {
      const ob = allObligations.items.find((item) => item.id === id);
      if (!ob) {
        throw new NotFoundException(`Monthly obligation ${id} not found`);
      }
      if (ob.memberId !== params.memberId) {
        throw new NotFoundException(`Obligation ${id} does not belong to member ${params.memberId}`);
      }
      if (ob.status !== 'UNPAID') {
        throw new ConflictException(`Obligation ${id} is already ${ob.status}`);
      }
      obligations.push(ob);
    }

    const totalContributionExpected = obligations.reduce((sum, ob) => sum + ob.expectedAmount, 0);
    
    let totalPenaltyExpected = 0;
    // Fix: Explicitly type unpaidPenalties so we can push Penalty objects
    const unpaidPenalties: { id: string; amount: number }[] = [];
    
    if (params.withPenalty) {
      for (const ob of obligations) {
        const penalty = await this.penaltyRepo.findPenaltyByObligationId(ob.id);
        if (penalty && penalty.status === 'UNPAID') {
          unpaidPenalties.push(penalty);
          totalPenaltyExpected += penalty.amount;
        }
      }
      if (unpaidPenalties.length === 0) {
        throw new BadRequestException('No penalty to pay for these months');
      }
    }

    const totalExpected = totalContributionExpected + totalPenaltyExpected;
    if (Math.abs(params.amount - totalExpected) > 0.01) {
      throw new BadRequestException(
        `Submitted amount (${params.amount}) does not match expected total (${totalExpected})`
      );
    }

    // Process Penalties
    const penaltyPayments: PenaltyPayment[] = [];
    if (params.withPenalty) {
      for (const penalty of unpaidPenalties) {
        const payment = await this.penaltyRepo.createPenaltyPayment({
          penaltyId: penalty.id,
          amount: penalty.amount,
          paymentDate: params.paymentDate,
          method: 'CASH',
          notes: params.notes,
          proofUrl: '',
        });
        const approved = await this.penaltyRepo.approvePenaltyPaymentAndMarkPaid(payment.id, adminUserId);
        if (approved) penaltyPayments.push(approved);
      }
    }

    // Process Contributions
    const allocations = obligations.map((ob) => ({
      monthlyObligationId: ob.id,
      amount: ob.expectedAmount,
    }));

    const contributionPayment = await this.repository.createPaymentWithAllocations({
      memberId: params.memberId,
      amount: totalContributionExpected,
      paymentDate: params.paymentDate,
      method: 'CASH',
      notes: params.notes,
      proofUrl: '',
      allocations,
    });

    const approvedContribution = await this.repository.approveAndMarkObligationsPaid(
      contributionPayment.id,
      adminUserId,
    );

    if (!approvedContribution) {
      throw new ConflictException('Failed to auto-approve the recorded contribution payment');
    }

    this.eventEmitter.emit('payment.approved', {
      memberId: approvedContribution.memberId,
      amount: approvedContribution.amount,
    });

    this.logger.log(`Record on behalf completed for member ${params.memberId} by admin ${adminUserId}`);

    return {
      contributionPayment: approvedContribution,
      penaltyPayments,
    };
  }
}
