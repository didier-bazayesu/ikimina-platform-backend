import { Injectable, Inject } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY } from './notification.repository.interface';
import type { NotificationRepositoryInterface } from './notification.repository.interface';
import { Notification } from './notification';
import { NotificationType } from './notification-type';

import type { NotificationServiceInterface } from './notification.service.interface';

@Injectable()
export class NotificationService implements NotificationServiceInterface {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepositoryInterface,
  ) {}

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
  ): Promise<Notification> {
    return this.notificationRepository.create({
      userId,
      type,
      title,
      message,
    });
  }

  async getUserNotifications(
    userId: string,
    unreadOnly: boolean,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    items: Notification[];
    page: number;
    limit: number;
    total: number;
  }> {
    return this.notificationRepository.listByUserId(
      userId,
      unreadOnly,
      page,
      limit,
    );
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    return this.notificationRepository.markAsRead(id, userId);
  }
}
