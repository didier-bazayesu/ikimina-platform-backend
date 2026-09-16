import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Inject,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../authentication.guard';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';
import { CurrentUser } from '../current-user.decorator';
import type { AuthenticatedUser } from '../authentication.guard';
import { RecordWithdrawalDto } from './record-withdrawal.dto';
import { ListWithdrawalsDto } from './list-withdrawals.dto';
import type { WithdrawalServiceInterface } from '../../application/withdrawal/withdrawal.service.interface';
import { WITHDRAWAL_SERVICE } from '../../application/withdrawal/withdrawal.service.interface';

@ApiTags('withdrawals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('withdrawals')
export class WithdrawalController {
  constructor(
    @Inject(WITHDRAWAL_SERVICE)
    private readonly service: WithdrawalServiceInterface,
  ) {}

  @Post()
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('supportingDoc'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Admin records a withdrawal' })
  @ApiResponse({ status: 201, description: 'Withdrawal recorded successfully' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async recordWithdrawal(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RecordWithdrawalDto,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @UploadedFile() file: any,
  ) {
    const withdrawalDate = new Date(dto.withdrawalDate);

    const fileData = file
      ? {
          originalname: file.originalname || 'supporting-doc.pdf',
          buffer: file.buffer || Buffer.from(''),
          mimetype: file.mimetype || 'application/pdf',
        }
      : undefined;

    const result = await this.service.recordWithdrawal({
      adminUserId: user.id,
      amount: dto.amount,
      withdrawalDate,
      beneficiary: dto.beneficiary,
      category: dto.category,
      description: dto.description,
      file: fileData,
    });

    return {
      success: true,
      data: result,
      message: 'Withdrawal recorded successfully',
    };
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin queries withdrawals' })
  @ApiResponse({ status: 200, description: 'List of withdrawals' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async listWithdrawals(@Query() dto: ListWithdrawalsDto) {
    const result = await this.service.listWithdrawals(dto);
    return {
      success: true,
      data: result,
      message: 'Withdrawals retrieved successfully',
    };
  }
}
