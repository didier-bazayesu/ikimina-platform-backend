import { Controller, Get, Query, UseGuards, Inject } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../authentication.guard';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';
import { CurrentUser } from '../current-user.decorator';
import type { AuthenticatedUser } from '../authentication.guard';
import { ListTransactionsDto } from './list-transactions.dto';
import type { TransactionServiceInterface } from '../../application/transaction/transaction.service.interface';
import { TRANSACTION_SERVICE } from '../../application/transaction/transaction.service.interface';

@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transactions')
export class TransactionController {
  constructor(
    @Inject(TRANSACTION_SERVICE)
    private readonly service: TransactionServiceInterface,
  ) {}

  @Get('balance')
  @Roles('ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Get available balance' })
  @ApiResponse({
    status: 200,
    description: 'Available balance retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  async getBalance() {
    const balance = await this.service.getAvailableBalance();
    return { balance };
  }

  @Get()
  @Roles('ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'List transactions' })
  @ApiResponse({ status: 200, description: 'List of transactions' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  async listTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() dto: ListTransactionsDto,
  ) {
    const result = await this.service.listTransactions({
      ...dto,
      currentUserRole: user.role,
      currentUserId: user.id,
    });
    return {
      success: true,
      data: result,
      message: 'Transactions retrieved successfully',
    };
  }
}
