import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import type {
  PenaltyServiceInterface,
  SubmitPenaltyPaymentParams,
  ListPenaltiesParams,
  ListPenaltiesResponse,
  ListPenaltyPaymentsParams,
  ListPenaltyPaymentsResponse,
} from './penalty.service.interface';
import type { PenaltyRepositoryInterface } from './penalty.repository.interface';
import { PENALTY_REPOSITORY } from './penalty.repository.interface';
import type { MonthlyObligationRepositoryInterface } from '../monthly-obligation/monthly-obligation.repository.interface';
import { MONTHLY_OBLIGATION_REPOSITORY } from '../monthly-obligation/monthly-obligation.repository.interface';
import type { SystemSettingsRepositoryInterface } from '../system-settings/system-settings.repository.interface';
import { SYSTEM_SETTINGS_REPOSITORY } from '../system-settings/system-settings.repository.interface';
import type { StorageAdapterInterface } from '../common/storage.interface';
import { STORAGE_ADAPTER } from '../common/storage.interface';
import type { TimeProviderInterface } from '../common/time-provider.interface';
import { TIME_PROVIDER } from '../common/time-provider.interface';
import type { Penalty } from './penalty';
import type { PenaltyPayment } from './penalty-payment';

@Injectable()
export class PenaltyService implements PenaltyServiceInterface {
  private readonly logger = new Logger(PenaltyService.name);

  constructor(
    @Inject(PENALTY_REPOSITORY)
    private readonly penaltyRepo: PenaltyRepositoryInterface,
    @Inject(MONTHLY_OBLIGATION_REPOSITORY)
    private readonly obligationRepo: MonthlyObligationRepositoryInterface,
    @Inject(SYSTEM_SETTINGS_REPOSITORY)
    private readonly settingsRepo: SystemSettingsRepositoryInterface,
    @Inject(STORAGE_ADAPTER)
    private readonly storageAdapter: StorageAdapterInterface,
    @Inject(TIME_PROVIDER)
    private readonly timeProvider: TimeProviderInterface,
  ) {}

  async generatePenaltiesForOverdueObligations(): Promise<Penalty[]> {
    const settings = await this.settingsRepo.getCurrent();
    const obligationsResult = await this.obligationRepo.list({
      status: 'UNPAID',
      page: 1,
      limit: 10000,
    });

    const generatedPenalties: Penalty[] = [];
    for (const ob of obligationsResult.items) {
      if (this.timeProvider.isOverdue(ob.year, ob.month, settings.dueDay)) {
        const existingPenalty =
          await this.penaltyRepo.findPenaltyByObligationId(ob.id);
        if (!existingPenalty) {
          const amount = ob.expectedAmount * (settings.penaltyPercentage / 100);
          const penalty = await this.penaltyRepo.createPenalty({
            memberId: ob.memberId,
            monthlyObligationId: ob.id,
            amount,
          });
          generatedPenalties.push(penalty);
        }
      }
    }
    this.logger.log(
      `Generated ${generatedPenalties.length} penalties for overdue obligations.`,
    );
    return generatedPenalties;
  }

  async submitPenaltyPayment(
    params: SubmitPenaltyPaymentParams,
  ): Promise<PenaltyPayment> {
    const penalty = await this.penaltyRepo.findPenaltyById(params.penaltyId);
    if (!penalty) throw new NotFoundException('Penalty not found');
    if (penalty.memberId !== params.memberId)
      throw new NotFoundException('Penalty not found');
    if (penalty.status !== 'UNPAID')
      throw new BadRequestException('Penalty is not UNPAID');

    const now = this.timeProvider.now();
    if (params.paymentDate > now) {
      throw new BadRequestException('Payment date cannot be in the future');
    }

    if (
      (params.method === 'MOMO' || params.method === 'BANK') &&
      (!params.reference || !params.reference.trim())
    ) {
      throw new BadRequestException(
        'Reference is required for MOMO and BANK methods',
      );
    }

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
      throw new BadRequestException('Invalid proof file type');
    }
    const maxSize = 10 * 1024 * 1024;
    if (params.file.buffer && params.file.buffer.length > maxSize) {
      throw new BadRequestException('Proof file too large');
    }

    if (Math.abs(params.amount - penalty.amount) > 0.01) {
      throw new BadRequestException('Amount does not match penalty amount');
    }

    const proofUrl = await this.storageAdapter.upload(params.file);

    await this.penaltyRepo.updatePenaltyStatus(penalty.id, 'PENDING');

    return this.penaltyRepo.createPenaltyPayment({
      penaltyId: penalty.id,
      amount: params.amount,
      paymentDate: params.paymentDate,
      method: params.method,
      reference: params.reference,
      notes: params.notes,
      proofUrl,
    });
  }

  async listPenalties(
    params: ListPenaltiesParams,
  ): Promise<ListPenaltiesResponse> {
    const page = Math.max(params.page ?? 1, 1);
    const limit = Math.min(params.limit ?? 20, 100);
    return this.penaltyRepo.listPenalties({ ...params, page, limit });
  }

  async getMyPenalties(
    memberId: string,
    params: ListPenaltiesParams,
  ): Promise<ListPenaltiesResponse> {
    return this.listPenalties({ ...params, memberId });
  }

  async listPenaltyPayments(
    params: ListPenaltyPaymentsParams,
  ): Promise<ListPenaltyPaymentsResponse> {
    const page = Math.max(params.page ?? 1, 1);
    const limit = Math.min(params.limit ?? 20, 100);
    return this.penaltyRepo.listPenaltyPayments({ ...params, page, limit });
  }

  async getMyPenaltyPayments(
    memberId: string,
    params: ListPenaltyPaymentsParams,
  ): Promise<ListPenaltyPaymentsResponse> {
    return this.listPenaltyPayments({ ...params, memberId });
  }

  async approvePenaltyPayment(
    id: string,
    adminUserId: string,
  ): Promise<PenaltyPayment> {
    const payment = await this.penaltyRepo.findPenaltyPaymentById(id);
    if (!payment) throw new NotFoundException('Penalty payment not found');
    if (payment.status !== 'PENDING')
      throw new ConflictException('Payment is not PENDING');

    const approved = await this.penaltyRepo.approvePenaltyPaymentAndMarkPaid(
      id,
      adminUserId,
    );
    if (!approved)
      throw new ConflictException('Failed to approve penalty payment');
    return approved;
  }

  async rejectPenaltyPayment(
    id: string,
    reason: string,
    adminUserId: string,
  ): Promise<PenaltyPayment> {
    if (!reason || !reason.trim())
      throw new BadRequestException('Reason is required');

    const payment = await this.penaltyRepo.findPenaltyPaymentById(id);
    if (!payment) throw new NotFoundException('Penalty payment not found');
    if (payment.status !== 'PENDING')
      throw new ConflictException('Payment is not PENDING');

    const rejected = await this.penaltyRepo.rejectPenaltyPayment(
      id,
      reason.trim(),
      adminUserId,
    );
    if (!rejected)
      throw new ConflictException('Failed to reject penalty payment');
    return rejected;
  }

  async waivePenalty(id: string): Promise<Penalty> {
    const penalty = await this.penaltyRepo.findPenaltyById(id);
    if (!penalty) throw new NotFoundException('Penalty not found');
    if (penalty.status === 'PAID' || penalty.status === 'WAIVED') {
      throw new ConflictException(
        `Cannot waive penalty in status ${penalty.status}`,
      );
    }

    const waived = await this.penaltyRepo.updatePenaltyStatus(id, 'WAIVED');
    if (!waived) throw new ConflictException('Failed to waive penalty');
    return waived;
  }
}
