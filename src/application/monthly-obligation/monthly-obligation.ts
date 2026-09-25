export type MonthlyObligationStatus = 'UNPAID' | 'PAID';

export interface MonthlyObligation {
  id: string;
  memberId: string;
  month: number;
  year: number;
  expectedAmount: number;
  dueDay: number;
  currency: string;
  status: MonthlyObligationStatus;
  createdAt: Date;

  // Computed property (not in DB)
  isOverdue?: boolean;
}
