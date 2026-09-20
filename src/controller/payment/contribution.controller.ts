import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseUUIDPipe,
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
import { SubmitContributionPaymentDto } from './submit-contribution-payment.dto';
import { ListContributionPaymentsDto } from './list-contribution-payments.dto';
import { RejectContributionPaymentDto } from './reject-contribution-payment.dto';
import type { ContributionServiceInterface } from '../../application/payment/contribution.service.interface';
import { CONTRIBUTION_SERVICE } from '../../application/payment/contribution.service.interface';
import type { MemberRepositoryInterface } from '../../application/member/member.repository.interface';
import { MEMBER_REPOSITORY } from '../../application/member/member.repository.interface';

@ApiTags('contribution-payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contribution-payments')
export class ContributionController {
  constructor(
    @Inject(CONTRIBUTION_SERVICE)
    private readonly service: ContributionServiceInterface,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: MemberRepositoryInterface,
  ) {}

  @Post()
  @Roles('MEMBER')
  @UseInterceptors(FileInterceptor('proof'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Member submits payment evidence' })
  @ApiResponse({ status: 201, description: 'Payment submitted for review' })
  @ApiResponse({ status: 400, description: 'Validation failure / bad request' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Member role required' })
  @ApiResponse({
    status: 404,
    description: 'Obligation not found or not belonging to caller',
  })
  @ApiResponse({
    status: 409,
    description: 'Obligation already has pending/approved allocation',
  })
  async submitPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitContributionPaymentDto,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @UploadedFile() file: any,
  ) {
    if (!file && !dto.proofUrl) {
      throw new BadRequestException('Proof file or proofUrl is required');
    }

    const member = await this.memberRepo.findByUserId(user.id);
    if (!member) {
      throw new NotFoundException(
        'Authenticated user has no linked Member record',
      );
    }

    const paymentDate = new Date(dto.paymentDate);

    const result = await this.service.submitPayment({
      memberId: member.id,
      obligationIds: dto.obligationIds,
      amount: dto.amount,
      paymentDate,
      method: dto.method,
      reference: dto.reference,
      notes: dto.notes,
      proofUrl: dto.proofUrl,
      file: file
        ? {
            originalname: file.originalname || 'proof.pdf',
            buffer: file.buffer || Buffer.from(''),
            mimetype: file.mimetype || 'application/pdf',
          }
        : undefined,
    });

    return {
      success: true,
      data: result,
      message: 'Payment submitted for review',
    };
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin queries contribution payments' })
  @ApiResponse({ status: 200, description: 'List of contribution payments' })
  @ApiResponse({ status: 400, description: 'Invalid query params' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async listPayments(@Query() dto: ListContributionPaymentsDto) {
    const result = await this.service.listPayments(dto);
    return {
      success: true,
      data: result,
      message: 'Contribution payments retrieved',
    };
  }

  @Get('me')
  @Roles('MEMBER')
  @ApiOperation({ summary: 'Member views own contribution payments' })
  @ApiResponse({
    status: 200,
    description: 'Own contribution payments retrieved',
  })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Member role required' })
  @ApiResponse({ status: 404, description: 'No linked member record' })
  async getMyPayments(
    @CurrentUser() user: AuthenticatedUser,
    @Query() dto: ListContributionPaymentsDto,
  ) {
    const member = await this.memberRepo.findByUserId(user.id);
    if (!member) {
      throw new NotFoundException(
        'Authenticated user has no linked Member record',
      );
    }

    const result = await this.service.getMyPayments(member.id, dto);
    return {
      success: true,
      data: result,
      message: 'Own contribution payments retrieved',
    };
  }

  @Patch(':id/approve')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin approves a pending contribution payment' })
  @ApiResponse({ status: 200, description: 'Payment approved' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiResponse({ status: 409, description: 'Payment is not currently PENDING' })
  async approvePayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.service.approvePayment(id, user.id);
    return {
      success: true,
      data: result,
      message: 'Payment approved',
    };
  }

  @Patch(':id/reject')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin rejects a pending contribution payment' })
  @ApiResponse({ status: 200, description: 'Payment rejected' })
  @ApiResponse({ status: 400, description: 'Missing rejection reason' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiResponse({ status: 409, description: 'Payment is not currently PENDING' })
  async rejectPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectContributionPaymentDto,
  ) {
    const result = await this.service.rejectPayment(id, dto.reason, user.id);
    return {
      success: true,
      data: result,
      message: 'Payment rejected',
    };
  }
}
