import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { PenaltyServiceInterface } from './penalty.service.interface';
import { PENALTY_SERVICE } from './penalty.service.interface';

import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PenaltyScheduler {
  private readonly logger = new Logger(PenaltyScheduler.name);

  constructor(
    @Inject(PENALTY_SERVICE)
    private readonly service: PenaltyServiceInterface,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Run daily at 01:00 Africa/Kigali time
  @Cron('0 1 * * *', { timeZone: 'Africa/Kigali' })
  async handleCron() {
    this.logger.log('Executing daily penalty generation');
    try {
      const generatedPenalties =
        await this.service.generatePenaltiesForOverdueObligations();
      for (const penalty of generatedPenalties) {
        this.eventEmitter.emit('penalty.generated', {
          memberId: penalty.memberId,
          amount: penalty.amount,
          monthlyObligationId: penalty.monthlyObligationId,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed penalty generation: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
