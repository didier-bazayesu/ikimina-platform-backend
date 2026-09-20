import { Module } from '@nestjs/common';
import { NotificationService } from '../application/notification/notification.service';
import { NotificationListener } from '../application/notification/notification.listener';
import { NOTIFICATION_REPOSITORY } from '../application/notification/notification.repository.interface';
import { NotificationRepository } from '../persistence/notification.repository';
import { NotificationController } from '../controller/notification/notification.controller';
import { MemberModule } from './member.module';
import { AuthenticationModule } from './authentication.module';

import { NOTIFICATION_SERVICE } from '../application/notification/notification.service.interface';

@Module({
  imports: [MemberModule, AuthenticationModule],
  controllers: [NotificationController],
  providers: [
    {
      provide: NOTIFICATION_SERVICE,
      useClass: NotificationService,
    },
    NotificationListener,
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: NotificationRepository,
    },
  ],
  exports: [NOTIFICATION_SERVICE],
})
export class NotificationModule {}
