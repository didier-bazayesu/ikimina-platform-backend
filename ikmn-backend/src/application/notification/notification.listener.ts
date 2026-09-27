import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NOTIFICATION_SERVICE } from './notification.service.interface';
import type { NotificationServiceInterface } from './notification.service.interface';
import { NotificationType } from './notification-type';
import { MEMBER_REPOSITORY } from '../member/member.repository.interface';
import type { MemberRepositoryInterface } from '../member/member.repository.interface';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService: NotificationServiceInterface,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepository: MemberRepositoryInterface,
  ) {}

  @OnEvent('payment.approved')
  async handlePaymentApproved(payload: { memberId: string; amount: number }) {
    try {
      const member = await this.memberRepository.findById(payload.memberId);
      if (!member) {
        this.logger.warn(
          `Member ${payload.memberId} not found, skipping notification.`,
        );
        return;
      }

      await this.notificationService.createNotification(
        member.userId,
        NotificationType.PAYMENT_APPROVED,
        'Payment Approved',
        `Your payment of ${payload.amount} has been approved.`,
      );

      // eslint-disable-next-line no-console
      console.log('Mock Email sent to:', member.email);
    } catch (error) {
      this.logger.error(
        'Error handling payment.approved event',
        (error as Error).stack,
      );
    }
  }

  @OnEvent('penalty.generated')
  async handlePenaltyGenerated(payload: {
    memberId: string;
    amount: number;
    monthlyObligationId: string;
  }) {
    try {
      const member = await this.memberRepository.findById(payload.memberId);
      if (!member) {
        this.logger.warn(
          `Member ${payload.memberId} not found, skipping notification.`,
        );
        return;
      }

      await this.notificationService.createNotification(
        member.userId,
        NotificationType.PENALTY_GENERATED,
        'Penalty Generated',
        `A penalty of ${payload.amount} has been generated for your overdue obligation.`,
      );

      // eslint-disable-next-line no-console
      console.log('Mock Email sent to:', member.email);
    } catch (error) {
      this.logger.error(
        'Error handling penalty.generated event',
        (error as Error).stack,
      );
    }
  }

  @OnEvent('payment.flagged')
  async handlePaymentFlagged(payload: { memberId: string; reason: string; message?: string }) {
    try {
      const member = await this.memberRepository.findById(payload.memberId);
      if (!member) {
        this.logger.warn(`Member ${payload.memberId} not found, skipping notification.`);
        return;
      }

      await this.notificationService.createNotification(
        member.userId,
        NotificationType.PAYMENT_FLAGGED,
        'Action Required: Payment Flagged',
        payload.message || payload.reason,
      );

      // eslint-disable-next-line no-console
      console.log('Mock Email sent to:', member.email, 'with reason:', payload.reason);
    } catch (error) {
      this.logger.error('Error handling payment.flagged event', (error as Error).stack);
    }
  }
}
