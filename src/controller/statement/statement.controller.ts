import {
  Controller,
  Get,
  Query,
  UseGuards,
  Inject,
  Res,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../authentication.guard';
import type { AuthenticatedUser } from '../authentication.guard';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';
import { CurrentUser } from '../current-user.decorator';
import { StatementQueryDto, StatementFormat } from './statement-query.dto';
import { STATEMENT_SERVICE } from '../../application/statement/statement.service.interface';
import type { StatementServiceInterface } from '../../application/statement/statement.service.interface';
import { StatementPdfGenerator } from '../../application/statement/statement-pdf.generator';
import { MEMBER_REPOSITORY } from '../../application/member/member.repository.interface';
import type { MemberRepositoryInterface } from '../../application/member/member.repository.interface';

@Controller('statements')
export class StatementController {
  constructor(
    @Inject(STATEMENT_SERVICE)
    private readonly statementService: StatementServiceInterface,
    private readonly statementPdfGenerator: StatementPdfGenerator,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepository: MemberRepositoryInterface,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MEMBER')
  async getMyStatement(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: StatementQueryDto,
    @Res() res: Response,
  ) {
    const member = await this.memberRepository.findByUserId(user.id);
    if (!member) {
      throw new NotFoundException('Member profile not found');
    }

    const statementData = await this.statementService.getMemberStatement(
      member.id,
      query,
    );

    if (query.format === StatementFormat.PDF) {
      const pdfBuffer =
        await this.statementPdfGenerator.generatePdf(statementData);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="statement.pdf"',
        'Content-Length': pdfBuffer.length,
      });
      return res.send(pdfBuffer);
    }

    return res.json(statementData);
  }
}
