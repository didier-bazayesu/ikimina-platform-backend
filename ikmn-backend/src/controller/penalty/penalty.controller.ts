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
import { SubmitPenaltyPaymentDto } from './submit-penalty-payment.dto';
import { ListPenaltiesDto } from './list-penalties.dto';
import { ListPenaltyPaymentsDto } from './list-penalty-payments.dto';
import { RejectPenaltyPaymentDto } from './reject-penalty-payment.dto';
import { FlagPaymentDto } from '../payment/flag-payment.dto';
import type { PenaltyServiceInterface } from '../../application/penalty/penalty.service.interface';
import { PENALTY_SERVICE } from '../../application/penalty/penalty.service.interface';
import type { MemberRepositoryInterface } from '../../application/member/member.repository.interface';
import { MEMBER_REPOSITORY } from '../../application/member/member.repository.interface';

@ApiTags('penalties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class PenaltyController {
  constructor(
    @Inject(PENALTY_SERVICE)
    private readonly service: PenaltyServiceInterface,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: MemberRepositoryInterface,
  ) {}

  @Post('penalties/generate-test')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin manually triggers penalty generation' })
  @ApiResponse({ status: 201, description: 'Penalties generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async generatePenalties() {
    await this.service.generatePenaltiesForOverdueObligations();
    return {
      success: true,
      data: null,
      message: 'Penalties generated successfully',
    };
  }

  @Post('penalty-payments')
  @Roles('MEMBER')
  @UseInterceptors(FileInterceptor('proof'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Member submits penalty payment evidence' })
  @ApiResponse({ status: 201, description: 'Payment submitted for review' })
  @ApiResponse({ status: 400, description: 'Validation failure / bad request' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Member role required' })
  @ApiResponse({
    status: 404,
    description: 'Penalty not found or not belonging to caller',
  })
  async submitPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitPenaltyPaymentDto,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('Proof file is required');
    }

    const member = await this.memberRepo.findByUserId(user.id);
    if (!member) {
      throw new NotFoundException(
        'Authenticated user has no linked Member record',
      );
    }

    const paymentDate = new Date(dto.paymentDate);

    const result = await this.service.submitPenaltyPayment({
      memberId: member.id,
      penaltyId: dto.penaltyId,
      amount: dto.amount,
      paymentDate,
      method: dto.method,
      reference: dto.reference,
      notes: dto.notes,
      file: {
        originalname: file.originalname || 'proof.pdf',
        buffer: file.buffer || Buffer.from(''),
        mimetype: file.mimetype || 'application/pdf',
      },
    });

    return {
      success: true,
      data: result,
      message: 'Payment submitted for review',
    };
  }

  @Get('penalty-payments')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin queries penalty payments' })
  @ApiResponse({ status: 200, description: 'List of penalty payments' })
  @ApiResponse({ status: 400, description: 'Invalid query params' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async listPayments(@Query() dto: ListPenaltyPaymentsDto) {
    const result = await this.service.listPenaltyPayments(dto);
    return {
      success: true,
      data: result,
      message: 'Penalty payments retrieved',
    };
  }

  @Get('penalty-payments/me')
  @Roles('MEMBER')
  @ApiOperation({ summary: 'Member views own penalty payments' })
  @ApiResponse({
    status: 200,
    description: 'Own penalty payments retrieved',
  })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Member role required' })
  @ApiResponse({ status: 404, description: 'No linked member record' })
  async getMyPayments(
    @CurrentUser() user: AuthenticatedUser,
    @Query() dto: ListPenaltyPaymentsDto,
  ) {
    const member = await this.memberRepo.findByUserId(user.id);
    if (!member) {
      throw new NotFoundException(
        'Authenticated user has no linked Member record',
      );
    }

    const result = await this.service.getMyPenaltyPayments(member.id, dto);
    return {
      success: true,
      data: result,
      message: 'Own penalty payments retrieved',
    };
  }

  @Patch('penalty-payments/:id/approve')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin approves a pending penalty payment' })
  @ApiResponse({ status: 200, description: 'Payment approved' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiResponse({ status: 409, description: 'Payment is not currently PENDING' })
  async approvePayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.service.approvePenaltyPayment(id, user.id);
    return {
      success: true,
      data: result,
      message: 'Payment approved',
    };
  }

  @Patch('penalty-payments/:id/reject')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin rejects a pending penalty payment' })
  @ApiResponse({ status: 200, description: 'Payment rejected' })
  @ApiResponse({ status: 400, description: 'Missing rejection reason' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiResponse({ status: 409, description: 'Payment is not currently PENDING' })
  async rejectPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectPenaltyPaymentDto,
  ) {
    const result = await this.service.rejectPenaltyPayment(
      id,
      dto.reason,
      user.id,
    );
    return {
      success: true,
      data: result,
      message: 'Payment rejected',
    };
  }

  @Patch('penalty-payments/:id/flag')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin flags a pending penalty payment to send a message' })
  @ApiResponse({ status: 200, description: 'Payment flagged and message sent' })
  @ApiResponse({ status: 400, description: 'Missing reason or message' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiResponse({ status: 409, description: 'Payment is not currently PENDING' })
  async flagPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FlagPaymentDto,
  ) {
    const result = await this.service.flagPenaltyPayment(
      id,
      dto.reason,
      dto.message,
      user.id,
    );
    return {
      success: true,
      data: result,
      message: 'Message sent to member successfully',
    };
  }

  @Patch('penalties/:id/waive')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin waives a penalty directly' })
  @ApiResponse({ status: 200, description: 'Penalty waived' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Penalty not found' })
  async waivePenalty(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.service.waivePenalty(id);
    return {
      success: true,
      data: result,
      message: 'Penalty waived',
    };
  }

  @Get('penalties')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin queries penalties' })
  @ApiResponse({ status: 200, description: 'List of penalties' })
  @ApiResponse({ status: 400, description: 'Invalid query params' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async listPenalties(@Query() dto: ListPenaltiesDto) {
    const result = await this.service.listPenalties(dto);
    return {
      success: true,
      data: result,
      message: 'Penalties retrieved',
    };
  }

  @Get('penalties/me')
  @Roles('MEMBER')
  @ApiOperation({ summary: 'Member views own penalties' })
  @ApiResponse({
    status: 200,
    description: 'Own penalties retrieved',
  })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Member role required' })
  @ApiResponse({ status: 404, description: 'No linked member record' })
  async getMyPenalties(
    @CurrentUser() user: AuthenticatedUser,
    @Query() dto: ListPenaltiesDto,
  ) {
    const member = await this.memberRepo.findByUserId(user.id);
    if (!member) {
      throw new NotFoundException(
        'Authenticated user has no linked Member record',
      );
    }

    const result = await this.service.getMyPenalties(member.id, dto);
    return {
      success: true,
      data: result,
      message: 'Own penalties retrieved',
    };
  }
}
