import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mocked } from 'vitest';
import { TransactionService } from './transaction.service';
import { TransactionRepositoryInterface } from './transaction.repository.interface';
import { BadRequestException } from '@nestjs/common';

describe('TransactionService', () => {
  let transactionService: TransactionService;
  let mockTransactionRepository: Mocked<TransactionRepositoryInterface>;

  beforeEach(() => {
    mockTransactionRepository = {
      list: vi.fn(),
      calculateAvailableBalance: vi.fn(),
    };
    transactionService = new TransactionService(mockTransactionRepository);
  });

  describe('listTransactions', () => {
    it('should force memberId to currentUserId if user is MEMBER', async () => {
      mockTransactionRepository.list.mockResolvedValue({
        items: [],
        page: 1,
        limit: 20,
        total: 0,
      });

      await transactionService.listTransactions({
        currentUserRole: 'MEMBER',
        currentUserId: 'user-123',
        memberId: 'other-user-456', // Should be ignored
      });

      expect(mockTransactionRepository.list).toHaveBeenCalledWith({
        memberId: 'user-123',
        type: undefined,
        startDate: undefined,
        endDate: undefined,
        page: 1,
        limit: 20,
      });
    });

    it('should allow filtering by memberId if user is ADMIN', async () => {
      mockTransactionRepository.list.mockResolvedValue({
        items: [],
        page: 1,
        limit: 20,
        total: 0,
      });

      await transactionService.listTransactions({
        currentUserRole: 'ADMIN',
        currentUserId: 'admin-123',
        memberId: 'other-user-456',
      });

      expect(mockTransactionRepository.list).toHaveBeenCalledWith({
        memberId: 'other-user-456',
        type: undefined,
        startDate: undefined,
        endDate: undefined,
        page: 1,
        limit: 20,
      });
    });

    it('should parse valid dates and pass them to repository', async () => {
      mockTransactionRepository.list.mockResolvedValue({
        items: [],
        page: 1,
        limit: 20,
        total: 0,
      });

      await transactionService.listTransactions({
        currentUserRole: 'ADMIN',
        currentUserId: 'admin-123',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });

      expect(mockTransactionRepository.list).toHaveBeenCalledWith({
        memberId: undefined,
        type: undefined,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        page: 1,
        limit: 20,
      });
    });

    it('should throw BadRequestException if startDate is invalid', async () => {
      await expect(
        transactionService.listTransactions({
          currentUserRole: 'ADMIN',
          currentUserId: 'admin-123',
          startDate: 'invalid-date',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if endDate is invalid', async () => {
      await expect(
        transactionService.listTransactions({
          currentUserRole: 'ADMIN',
          currentUserId: 'admin-123',
          endDate: 'invalid-date',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAvailableBalance', () => {
    it('should return the balance from repository', async () => {
      mockTransactionRepository.calculateAvailableBalance.mockResolvedValue(
        1000,
      );

      const result = await transactionService.getAvailableBalance();

      expect(result).toBe(1000);
      expect(
        mockTransactionRepository.calculateAvailableBalance,
      ).toHaveBeenCalled();
    });
  });
});
