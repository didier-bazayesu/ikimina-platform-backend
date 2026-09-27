import { Injectable } from '@nestjs/common';
import type { TimeProviderInterface } from './time-provider.interface';

@Injectable()
export class TimeProvider implements TimeProviderInterface {
  now(): Date {
    return new Date();
  }

  isOverdue(year: number, month: number, dueDay: number): boolean {
    const current = this.now();
    // Month is 1-12, but Date constructor expects 0-11
    // By providing dueDay, it calculates midnight in local time (or UTC if we construct explicitly)
    // To avoid timezone edge cases, we compare UTC midnights, or just local.
    // For simplicity, constructing `new Date(year, month - 1, dueDay, 23, 59, 59, 999)`
    // means it's overdue only after the very end of the due day.
    const deadline = new Date(year, month - 1, dueDay, 23, 59, 59, 999);

    return current.getTime() > deadline.getTime();
  }
}
