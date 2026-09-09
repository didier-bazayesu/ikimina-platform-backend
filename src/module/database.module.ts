import { Global, Module } from '@nestjs/common';
import { DatabaseConnection } from '../persistence/database-connection';
import { IDatabaseConnection } from '../persistence/database-connection.interface';

@Global()
@Module({
  providers: [
    {
      provide: IDatabaseConnection,
      useClass: DatabaseConnection,
    },
  ],
  exports: [IDatabaseConnection],
})
export class DatabaseModule {}
