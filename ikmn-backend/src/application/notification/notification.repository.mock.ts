import { NotificationRepositoryInterface } from './notification.repository.interface';
import { Notification } from './notification';
import { randomUUID } from 'crypto';

export class NotificationRepositoryMock implements NotificationRepositoryInterface {
  private notifications: Notification[] = [];

  async create(
    notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>,
  ): Promise<Notification> {
    const newNotification = new Notification(
      randomUUID(),
      notification.userId,
      notification.type,
      notification.title,
      notification.message,
      false,
      new Date(),
    );
    this.notifications.push(newNotification);
    return newNotification;
  }

  async listByUserId(
    userId: string,
    unreadOnly: boolean,
    page: number,
    limit: number,
  ): Promise<{
    items: Notification[];
    page: number;
    limit: number;
    total: number;
  }> {
    let items = this.notifications.filter((n) => n.userId === userId);

    if (unreadOnly) {
      items = items.filter((n) => !n.isRead);
    }

    // sort desc by created at
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // pagination (mocking simple approach)
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);

    return { items: paginatedItems, page, limit, total: items.length };
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    const index = this.notifications.findIndex(
      (n) => n.id === id && n.userId === userId,
    );
    if (index === -1) return null;

    const notif = this.notifications[index];
    this.notifications[index] = new Notification(
      notif.id,
      notif.userId,
      notif.type,
      notif.title,
      notif.message,
      true,
      notif.createdAt,
    );
    return this.notifications[index];
  }
}
