import { StatementData } from './statement.repository.interface';
import { StatementQueryDto } from '../../controller/statement/statement-query.dto';

export interface StatementServiceInterface {
  getMemberStatement(
    memberId: string,
    filters: StatementQueryDto,
  ): Promise<StatementData>;
}

export const STATEMENT_SERVICE = Symbol('STATEMENT_SERVICE');
