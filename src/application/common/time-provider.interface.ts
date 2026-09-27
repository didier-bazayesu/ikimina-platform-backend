export interface TimeProviderInterface {
  /**
   * Returns the current date/time
   */
  now(): Date;

  /**
   * Helper to check if a specific due day of a month/year is passed
   */
  isOverdue(year: number, month: number, dueDay: number): boolean;
}

export const TIME_PROVIDER = Symbol('TIME_PROVIDER');
