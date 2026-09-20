import { Notification } from './notification';

export interface NotificationRepositoryInterface {
  create(
    notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>,
  ): Promise<Notification>;
  listByUserId(
    userId: string,
    unreadOnly: boolean,
    page: number,
    limit: number,
  ): Promise<{
    items: Notification[];
    page: number;
    limit: number;
    total: number;
  }>;
  markAsRead(id: string, userId: string): Promise<Notification | null>;
}

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');
