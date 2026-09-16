import { Inject, Injectable } from '@nestjs/common';
import type { Withdrawal } from './withdrawal';
import {
  WithdrawalServiceInterface,
  RecordWithdrawalParams,
  ListWithdrawalsParams,
  ListWithdrawalsResponse,
} from './withdrawal.service.interface';
import {
  WithdrawalRepositoryInterface,
  WITHDRAWAL_REPOSITORY,
} from './withdrawal.repository.interface';
import {
  StorageAdapterInterface,
  STORAGE_ADAPTER,
} from '../common/storage.interface';
import {
  TimeProviderInterface,
  TIME_PROVIDER,
} from '../common/time-provider.interface';

@Injectable()
export class WithdrawalService implements WithdrawalServiceInterface {
  constructor(
    @Inject(WITHDRAWAL_REPOSITORY)
    private readonly repository: WithdrawalRepositoryInterface,
    @Inject(STORAGE_ADAPTER)
    private readonly storageAdapter: StorageAdapterInterface,
    @Inject(TIME_PROVIDER)
    private readonly timeProvider: TimeProviderInterface,
  ) {}

  async recordWithdrawal(params: RecordWithdrawalParams): Promise<Withdrawal> {
    if (params.amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    const now = this.timeProvider.now();
    if (params.withdrawalDate > now) {
      throw new Error('Withdrawal date cannot be in the future');
    }

    let supportingDocUrl: string | undefined;

    if (params.file) {
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedMimeTypes.includes(params.file.mimetype)) {
        throw new Error('Invalid file type');
      }

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (params.file.buffer.length > maxSize) {
        throw new Error('File size exceeds the limit');
      }

      supportingDocUrl = await this.storageAdapter.upload(params.file);
    }

    return this.repository.create({
      amount: params.amount,
      withdrawalDate: params.withdrawalDate,
      beneficiary: params.beneficiary,
      category: params.category,
      description: params.description,
      supportingDocUrl,
      createdBy: params.adminUserId,
    });
  }

  async listWithdrawals(
    params: ListWithdrawalsParams,
  ): Promise<ListWithdrawalsResponse> {
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (params.startDate) {
      startDate = new Date(params.startDate);
      if (isNaN(startDate.getTime())) {
        throw new Error('Invalid start date');
      }
    }

    if (params.endDate) {
      endDate = new Date(params.endDate);
      if (isNaN(endDate.getTime())) {
        throw new Error('Invalid end date');
      }
    }

    const page = params.page || 1;
    const limit = params.limit || 20;

    return this.repository.list({
      category: params.category,
      startDate,
      endDate,
      page,
      limit,
    });
  }
}
