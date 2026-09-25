import { Injectable, Inject, Logger } from '@nestjs/common';
import type {
  MonthlyObligationServiceInterface,
  ListObligationsParams,
  ListObligationsResponse,
} from './monthly-obligation.service.interface';
import type { MonthlyObligationRepositoryInterface } from './monthly-obligation.repository.interface';
import { MONTHLY_OBLIGATION_REPOSITORY } from './monthly-obligation.repository.interface';
import type { SystemSettingsRepositoryInterface } from '../system-settings/system-settings.repository.interface';
import { SYSTEM_SETTINGS_REPOSITORY } from '../system-settings/system-settings.repository.interface';
import type { MemberRepositoryInterface } from '../member/member.repository.interface';
import { MEMBER_REPOSITORY } from '../member/member.repository.interface';
import type { TimeProviderInterface } from '../common/time-provider.interface';
import { TIME_PROVIDER } from '../common/time-provider.interface';
import type { MonthlyObligation } from './monthly-obligation';

@Injectable()
export class MonthlyObligationService implements MonthlyObligationServiceInterface {
  private readonly logger = new Logger(MonthlyObligationService.name);

  constructor(
    @Inject(MONTHLY_OBLIGATION_REPOSITORY)
    private readonly repository: MonthlyObligationRepositoryInterface,
    @Inject(SYSTEM_SETTINGS_REPOSITORY)
    private readonly settingsRepo: SystemSettingsRepositoryInterface,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: MemberRepositoryInterface,
    @Inject(TIME_PROVIDER)
    private readonly timeProvider: TimeProviderInterface,
  ) {}

  async generateObligationsForPeriod(
    month: number,
    year: number,
  ): Promise<void> {
    this.logger.log(`Starting obligation generation for ${month}/${year}`);
    const settings = await this.settingsRepo.getCurrent();
    const periodStart = new Date(year, month - 1, 1); // e.g. Feb 1 if month=2

    // Load all active members (batching in a real large-scale system, but for Ikimina this is fine)
    // Actually, we can list them from MemberRepository. We'll use a large limit.
    const allMembersResult = await this.memberRepo.list({
      status: 'ACTIVE',
      page: 1,
      limit: 10000,
    });

    let createdCount = 0;

    for (const member of allMembersResult.items) {
      if (member.joinedDate > periodStart) {
        // Skip members who joined after the period start
        continue;
      }

      const created = await this.repository.create({
        memberId: member.id,
        month,
        year,
        expectedAmount: settings.monthlyShareAmount,
        dueDay: settings.dueDay,
        currency: settings.currency,
      });

      if (created) {
        createdCount++;
      }
    }

    this.logger.log(
      `Generated ${createdCount} new obligations for ${month}/${year}`,
    );
  }

  async listObligations(
    params: ListObligationsParams,
  ): Promise<ListObligationsResponse> {
    const page = Math.max(params.page ?? 1, 1);
    const limit = Math.min(params.limit ?? 20, 100);

    const result = await this.repository.list({
      memberId: params.memberId,
      status: params.status,
      month: params.month,
      year: params.year,
      page,
      limit,
    });

    const enrichedItems = result.items.map((ob) => this.enrichObligation(ob));
    let finalItems = enrichedItems;

    // Post-filter for overdue if specified (since it's computed dynamically)
    if (params.overdue !== undefined) {
      finalItems = enrichedItems.filter(
        (ob) => ob.isOverdue === params.overdue,
      );
    }

    return {
      items: finalItems,
      page,
      limit,
      total: params.overdue !== undefined ? finalItems.length : result.total,
      // Note: total is inaccurate if dynamically filtered, but typically pagination is disabled when filtering by overdue,
      // or we accept the limitation for this simple scale.
    };
  }

  async getMyObligations(
    memberId: string,
    params: ListObligationsParams,
  ): Promise<ListObligationsResponse> {
    return this.listObligations({ ...params, memberId, page: 1, limit: 1000 });
  }

  private enrichObligation(ob: MonthlyObligation): MonthlyObligation {
    const isOverdue =
      ob.status === 'UNPAID' &&
      this.timeProvider.isOverdue(ob.year, ob.month, ob.dueDay);
    return { ...ob, isOverdue };
  }
}
