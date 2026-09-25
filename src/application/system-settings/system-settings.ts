export interface SystemSettings {
  id: number;
  monthlyShareAmount: number;
  penaltyPercentage: number;
  dueDay: number;
  currency: string;
  updatedAt: Date;
  updatedBy: string | null;
}
