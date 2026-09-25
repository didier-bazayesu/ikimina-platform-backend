import type { Notification } from './notification';
export interface NotificationServiceInterface {
  createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
  ): Promise<Notification>;
  getUserNotifications(
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
export const NOTIFICATION_SERVICE = Symbol('NOTIFICATION_SERVICE');
