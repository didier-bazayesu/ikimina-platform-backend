export interface ContributionAllocation {
  id: string;
  contributionPaymentId: string;
  monthlyObligationId: string;
  amount: number;
  createdAt: Date;
  month?: number;
  year?: number;
}
