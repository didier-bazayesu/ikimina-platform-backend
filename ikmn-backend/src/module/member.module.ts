import { Module, forwardRef } from '@nestjs/common';
import { MEMBER_REPOSITORY } from '../application/member/member.repository.interface';
import { MemberRepository } from '../persistence/member.repository';
import { MEMBER_SERVICE } from '../application/member/member.service.interface';
import { MemberService } from '../application/member/member.service';
import { MemberController } from '../controller/member/member.controller';
import { AuthenticationModule } from './authentication.module';
import { MonthlyObligationModule } from './monthly-obligation.module';
import { ContributionModule } from './contribution.module';
import { PenaltyModule } from './penalty.module';

@Module({
  imports: [
    // Re-uses JwtAuthGuard, RolesGuard, USER_REPOSITORY, PASSWORD_HASHER
    AuthenticationModule,
    forwardRef(() => MonthlyObligationModule),
    forwardRef(() => ContributionModule),
    forwardRef(() => PenaltyModule),
  ],
  controllers: [MemberController],
  providers: [
    { provide: MEMBER_REPOSITORY, useClass: MemberRepository },
    { provide: MEMBER_SERVICE, useClass: MemberService },
  ],
  exports: [MEMBER_SERVICE, MEMBER_REPOSITORY],
})
export class MemberModule {}
