import {
  Body,
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { MemberServiceInterface } from '../../application/member/member.service.interface';
import { MEMBER_SERVICE } from '../../application/member/member.service.interface';
import { JwtAuthGuard } from '../authentication.guard';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';
import { CurrentUser } from '../current-user.decorator';
import type { AuthenticatedUser } from '../authentication.guard';
import { CreateMemberDto } from './create-member.dto';
import { ListMembersDto } from './list-members.dto';
import { UpdateMemberDto } from './update-member.dto';
import { UpdateMemberStatusDto } from './update-member-status.dto';
import { UpdateOwnProfileDto } from './update-own-profile.dto';

@Controller('members')
@ApiTags('members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class MemberController {
  constructor(
    @Inject(MEMBER_SERVICE)
    private readonly memberService: MemberServiceInterface,
  ) {}

  // ── IKM-2.2: POST /members ────────────────────────────────────────────────

  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Admin creates a new member (and linked user account)',
  })
  @ApiResponse({ status: 201, description: 'Member created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({
    status: 409,
    description: 'Email or phone already registered',
  })
  @ApiResponse({ status: 500, description: 'Unexpected error' })
  async createMember(@Body() dto: CreateMemberDto) {
    const member = await this.memberService.createMember({
      email: dto.email,
      phone: dto.phone,
      password: dto.password,
      fullName: dto.fullName,
      nationalId: dto.nationalId,
      address: dto.address,
      joinedDate: dto.joinedDate,
    });
    return { data: member, message: 'Member created successfully' };
  }

  // ── IKM-2.3: GET /members ─────────────────────────────────────────────────

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin lists members (paginated, with filters)' })
  @ApiResponse({ status: 200, description: 'Members retrieved' })
  @ApiResponse({ status: 400, description: 'Invalid query params' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async listMembers(@Query() query: ListMembersDto) {
    const result = await this.memberService.listMembers({
      status: query.status,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
    return { data: result, message: 'Members retrieved' };
  }

  // ── IKM-2.7: GET /members/me  ─────────────────────────────────────────────
  // IMPORTANT: must be declared BEFORE GET /members/:id so Express does not
  // treat the literal string "me" as an :id param.

  @Get('me')
  @Roles('MEMBER')
  @ApiOperation({ summary: 'Member views their own profile' })
  @ApiResponse({ status: 200, description: 'Profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 404, description: 'No linked member record' })
  async getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    const member = await this.memberService.getMyProfile(user.id);
    return { data: member, message: 'Member retrieved' };
  }

  // ── IKM-2.8: PATCH /members/me ───────────────────────────────────────────
  // Same ordering rule as above — must come before PATCH /members/:id.

  @Patch('me')
  @Roles('MEMBER')
  @ApiOperation({ summary: 'Member updates their own profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 400, description: 'Empty body or invalid field' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 404, description: 'No linked member record' })
  @ApiResponse({ status: 409, description: 'Phone already registered' })
  async updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOwnProfileDto,
  ) {
    if (!dto.fullName && !dto.phone && !dto.address) {
      throw new BadRequestException('At least one field must be provided');
    }
    const member = await this.memberService.updateMyProfile(user.id, dto);
    return { data: member, message: 'Profile updated' };
  }

  // ── IKM-2.4: GET /members/:id ─────────────────────────────────────────────

  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin gets a single member by ID' })
  @ApiResponse({ status: 200, description: 'Member retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async getMemberById(
    @Param(
      'id',
      new ParseUUIDPipe({
        exceptionFactory: () => new NotFoundException('Member not found'),
      }),
    )
    id: string,
  ) {
    const member = await this.memberService.getMemberById(id);
    return { data: member, message: 'Member retrieved' };
  }

  // ── IKM-2.5: PATCH /members/:id ──────────────────────────────────────────

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: "Admin updates a member's details" })
  @ApiResponse({ status: 200, description: 'Member updated' })
  @ApiResponse({ status: 400, description: 'Empty body or invalid field' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  @ApiResponse({ status: 409, description: 'Phone already registered' })
  async updateMember(
    @Param(
      'id',
      new ParseUUIDPipe({
        exceptionFactory: () => new NotFoundException('Member not found'),
      }),
    )
    id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    if (!dto.fullName && !dto.phone && !dto.address && !dto.nationalId) {
      throw new BadRequestException('At least one field must be provided');
    }
    const member = await this.memberService.updateMember(id, dto);
    return { data: member, message: 'Member updated' };
  }

  // ── IKM-2.6: PATCH /members/:id/status ───────────────────────────────────

  @Patch(':id/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin suspends, reactivates, or exits a member' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status or missing reason' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async updateMemberStatus(
    @Param(
      'id',
      new ParseUUIDPipe({
        exceptionFactory: () => new NotFoundException('Member not found'),
      }),
    )
    id: string,
    @Body() dto: UpdateMemberStatusDto,
  ) {
    const result = await this.memberService.updateMemberStatus(id, {
      status: dto.status,
      reason: dto.reason,
    });
    return { data: result, message: 'Member status updated' };
  }
}
