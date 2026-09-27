import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { MonthlyObligationServiceInterface } from './monthly-obligation.service.interface';
import { MONTHLY_OBLIGATION_SERVICE } from './monthly-obligation.service.interface';
import type { TimeProviderInterface } from '../common/time-provider.interface';
import { TIME_PROVIDER } from '../common/time-provider.interface';

@Injectable()
export class MonthlyObligationScheduler {
  private readonly logger = new Logger(MonthlyObligationScheduler.name);

  constructor(
    @Inject(MONTHLY_OBLIGATION_SERVICE)
    private readonly service: MonthlyObligationServiceInterface,
    @Inject(TIME_PROVIDER)
    private readonly timeProvider: TimeProviderInterface,
  ) {}

  // Run at 00:05 on the 1st of every month in Africa/Kigali time
  @Cron('5 0 1 * *', { timeZone: 'Africa/Kigali' })
  async handleCron() {
    this.logger.log('Executing scheduled monthly obligation generation');

    // The current date when the job runs determines the period
    const now = this.timeProvider.now();
    const month = now.getMonth() + 1; // 1-12
    const year = now.getFullYear();

    try {
      await this.service.generateObligationsForPeriod(month, year);
    } catch (error) {
      this.logger.error(
        `Failed scheduled obligation generation: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
