import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from './database-connection.interface';
import type { IDatabaseConnection } from './database-connection.interface';
import type { NotificationRepositoryInterface } from '../application/notification/notification.repository.interface';
import { NOTIFICATION_REPOSITORY } from '../application/notification/notification.repository.interface';
import { Notification } from '../application/notification/notification';
import { NotificationType } from '../application/notification/notification-type';

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function toDomain(row: NotificationRow): Notification {
  return new Notification(
    row.id,
    row.user_id,
    row.type as NotificationType,
    row.title,
    row.message,
    row.is_read,
    new Date(row.created_at),
  );
}

@Injectable()
export class NotificationRepository implements NotificationRepositoryInterface {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: IDatabaseConnection,
  ) {}

  async create(
    notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>,
  ): Promise<Notification> {
    const rows = await this.db.query<NotificationRow>(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        notification.userId,
        notification.type,
        notification.title,
        notification.message,
      ],
    );
    return toDomain(rows[0]);
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
    const offset = (page - 1) * limit;
    const conditions = ['user_id = $1'];
    const params: unknown[] = [userId];

    if (unreadOnly) {
      conditions.push('is_read = false');
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM notifications ${where}`,
      params,
    );
    const total = parseInt(countRows[0].count, 10);

    params.push(limit, offset);
    const rows = await this.db.query<NotificationRow>(
      `SELECT * FROM notifications ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { items: rows.map(toDomain), page, limit, total };
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    const rows = await this.db.query<NotificationRow>(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }
}

export { NOTIFICATION_REPOSITORY };
