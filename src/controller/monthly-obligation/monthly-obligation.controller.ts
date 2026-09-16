import {
  Controller,
  Get,
  Query,
  UseGuards,
  Inject,
  NotFoundException,
  Post,
} from '@nestjs/common';
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
import { ListObligationsDto } from './list-obligations.dto';
import { ListOwnObligationsDto } from './list-own-obligations.dto';
import type { MonthlyObligationServiceInterface } from '../../application/monthly-obligation/monthly-obligation.service.interface';
import { MONTHLY_OBLIGATION_SERVICE } from '../../application/monthly-obligation/monthly-obligation.service.interface';
import type { MemberRepositoryInterface } from '../../application/member/member.repository.interface';
import { MEMBER_REPOSITORY } from '../../application/member/member.repository.interface';

@ApiTags('monthly-obligations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('monthly-obligations')
export class MonthlyObligationController {
  constructor(
    @Inject(MONTHLY_OBLIGATION_SERVICE)
    private readonly service: MonthlyObligationServiceInterface,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: MemberRepositoryInterface,
  ) {}

  @Post('generate-test')
  @Roles('ADMIN')
  @ApiOperation({
    summary:
      'FOR TESTING ONLY: Force generate obligations for a given period (defaults to current month)',
  })
  async generateTest(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const d = new Date();
    const targetMonth = month ? parseInt(month, 10) : d.getMonth() + 1;
    const targetYear = year ? parseInt(year, 10) : d.getFullYear();
    await this.service.generateObligationsForPeriod(targetMonth, targetYear);
    return { success: true, message: 'Test generation complete' };
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin queries obligations' })
  @ApiResponse({ status: 200, description: 'List of obligations' })
  @ApiResponse({ status: 400, description: 'Invalid query params' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async listObligations(@Query() dto: ListObligationsDto) {
    const result = await this.service.listObligations(dto);
    return { success: true, data: result, message: 'Obligations retrieved' };
  }

  @Get('me')
  @Roles('MEMBER')
  @ApiOperation({ summary: 'Member views own obligations' })
  @ApiResponse({ status: 200, description: 'List of own obligations' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Member role required' })
  @ApiResponse({ status: 404, description: 'No linked member record' })
  async getMyObligations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() dto: ListOwnObligationsDto,
  ) {
    const member = await this.memberRepo.findByUserId(user.id);
    if (!member) {
      throw new NotFoundException(
        'Authenticated user has no linked Member record',
      );
    }

    // Call service without pagination bounds (service will use a high limit)
    const result = await this.service.getMyObligations(member.id, dto);
    return {
      success: true,
      data: result,
      message: 'Own obligations retrieved',
    };
  }
}
