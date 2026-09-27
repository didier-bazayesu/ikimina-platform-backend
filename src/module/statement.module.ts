import { Module } from '@nestjs/common';
import { DatabaseModule } from './database.module';
import { AuthenticationModule } from './authentication.module';
import { MemberModule } from './member.module';

import { StatementController } from '../controller/statement/statement.controller';
import { StatementService } from '../application/statement/statement.service';
import { STATEMENT_SERVICE } from '../application/statement/statement.service.interface';
import { StatementPdfGenerator } from '../application/statement/statement-pdf.generator';
import { StatementRepository } from '../persistence/statement.repository';
import { STATEMENT_REPOSITORY } from '../application/statement/statement.repository.interface';

@Module({
  imports: [DatabaseModule, AuthenticationModule, MemberModule],
  controllers: [StatementController],
  providers: [
    {
      provide: STATEMENT_REPOSITORY,
      useClass: StatementRepository,
    },
    {
      provide: STATEMENT_SERVICE,
      useClass: StatementService,
    },
    StatementPdfGenerator,
  ],
  exports: [STATEMENT_SERVICE, StatementPdfGenerator, STATEMENT_REPOSITORY],
})
export class StatementModule {}
