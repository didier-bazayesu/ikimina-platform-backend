import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WithdrawalService } from './withdrawal.service';
import type { WithdrawalRepositoryInterface } from './withdrawal.repository.interface';
import type { StorageAdapterInterface } from '../common/storage.interface';
import type { TimeProviderInterface } from '../common/time-provider.interface';
import type { Withdrawal } from './withdrawal';

describe('WithdrawalService', () => {
  let repository: WithdrawalRepositoryInterface;
  let storageAdapter: StorageAdapterInterface;
  let timeProvider: TimeProviderInterface;
  let service: WithdrawalService;

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      list: vi.fn(),
    };
    storageAdapter = {
      upload: vi.fn(),
    };
    timeProvider = {
      now: vi.fn().mockReturnValue(new Date('2026-09-17T00:00:00Z')),
      isOverdue: vi.fn(),
    };

    service = new WithdrawalService(repository, storageAdapter, timeProvider);
  });

  describe('recordWithdrawal', () => {
    const validParams = {
      amount: 1000,
      withdrawalDate: new Date('2026-09-16T00:00:00Z'),
      beneficiary: 'John Doe',
      category: 'EXPENSE' as const,
      description: 'Office supplies',
      adminUserId: 'admin123',
    };

    it('should successfully record a withdrawal without a file', async () => {
      const expectedWithdrawal: Withdrawal = {
        id: '1',
        amount: validParams.amount,
        withdrawalDate: validParams.withdrawalDate,
        beneficiary: validParams.beneficiary,
        category: validParams.category,
        description: validParams.description,
        createdBy: validParams.adminUserId,
        createdAt: new Date(),
      };

      vi.mocked(repository.create).mockResolvedValue(expectedWithdrawal);

      const result = await service.recordWithdrawal(validParams);

      expect(repository.create).toHaveBeenCalledWith({
        amount: validParams.amount,
        withdrawalDate: validParams.withdrawalDate,
        beneficiary: validParams.beneficiary,
        category: validParams.category,
        description: validParams.description,
        supportingDocUrl: undefined,
        createdBy: validParams.adminUserId,
      });
      expect(result).toEqual(expectedWithdrawal);
    });

    it('should successfully record a withdrawal with a valid file', async () => {
      const file = {
        originalname: 'receipt.pdf',
        buffer: Buffer.from('mock-pdf-content'),
        mimetype: 'application/pdf',
      };

      const paramsWithFile = { ...validParams, file };
      const expectedUrl = 'https://storage.example.com/receipt.pdf';

      const expectedWithdrawal: Withdrawal = {
        id: '2',
        amount: validParams.amount,
        withdrawalDate: validParams.withdrawalDate,
        beneficiary: validParams.beneficiary,
        category: validParams.category,
        description: validParams.description,
        supportingDocUrl: expectedUrl,
        createdBy: validParams.adminUserId,
        createdAt: new Date(),
      };

      vi.mocked(storageAdapter.upload).mockResolvedValue(expectedUrl);
      vi.mocked(repository.create).mockResolvedValue(expectedWithdrawal);

      const result = await service.recordWithdrawal(paramsWithFile);

      expect(storageAdapter.upload).toHaveBeenCalledWith(file);
      expect(repository.create).toHaveBeenCalledWith({
        amount: validParams.amount,
        withdrawalDate: validParams.withdrawalDate,
        beneficiary: validParams.beneficiary,
        category: validParams.category,
        description: validParams.description,
        supportingDocUrl: expectedUrl,
        createdBy: validParams.adminUserId,
      });
      expect(result).toEqual(expectedWithdrawal);
    });

    it('should throw an error if amount is less than or equal to 0', async () => {
      const invalidParams = { ...validParams, amount: 0 };
      await expect(service.recordWithdrawal(invalidParams)).rejects.toThrow(
        'Amount must be greater than zero',
      );

      const negativeParams = { ...validParams, amount: -100 };
      await expect(service.recordWithdrawal(negativeParams)).rejects.toThrow(
        'Amount must be greater than zero',
      );
    });

    it('should throw an error if withdrawalDate is in the future', async () => {
      const invalidParams = {
        ...validParams,
        withdrawalDate: new Date('2026-09-18T00:00:00Z'),
      };
      await expect(service.recordWithdrawal(invalidParams)).rejects.toThrow(
        'Withdrawal date cannot be in the future',
      );
    });

    it('should throw an error if file size exceeds the limit', async () => {
      const file = {
        originalname: 'large.jpg',
        buffer: Buffer.alloc(6 * 1024 * 1024), // 6MB
        mimetype: 'image/jpeg',
      };
      const paramsWithLargeFile = { ...validParams, file };

      await expect(
        service.recordWithdrawal(paramsWithLargeFile),
      ).rejects.toThrow('File size exceeds the limit');
    });

    it('should throw an error if file mimetype is not allowed', async () => {
      const file = {
        originalname: 'script.sh',
        buffer: Buffer.from('echo hello'),
        mimetype: 'application/x-sh',
      };
      const paramsWithInvalidMime = { ...validParams, file };

      await expect(
        service.recordWithdrawal(paramsWithInvalidMime),
      ).rejects.toThrow('Invalid file type');
    });
  });

  describe('listWithdrawals', () => {
    it('should fetch withdrawals with default pagination', async () => {
      const mockResult = { items: [], page: 1, limit: 20, total: 0 };
      vi.mocked(repository.list).mockResolvedValue(mockResult);

      const result = await service.listWithdrawals({});

      expect(repository.list).toHaveBeenCalledWith({
        category: undefined,
        startDate: undefined,
        endDate: undefined,
        page: 1,
        limit: 20,
      });
      expect(result).toEqual(mockResult);
    });

    it('should correctly parse start and end dates', async () => {
      const mockResult = { items: [], page: 1, limit: 20, total: 0 };
      vi.mocked(repository.list).mockResolvedValue(mockResult);

      await service.listWithdrawals({
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      });

      expect(repository.list).toHaveBeenCalledWith({
        category: undefined,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        page: 1,
        limit: 20,
      });
    });

    it('should throw an error if start date is invalid', async () => {
      await expect(
        service.listWithdrawals({ startDate: 'invalid-date' }),
      ).rejects.toThrow('Invalid start date');
    });

    it('should throw an error if end date is invalid', async () => {
      await expect(
        service.listWithdrawals({ endDate: 'invalid-date' }),
      ).rejects.toThrow('Invalid end date');
    });
  });
});
