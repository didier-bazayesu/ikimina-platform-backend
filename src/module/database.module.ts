import { Global, Module } from '@nestjs/common';
import { DatabaseConnection } from '../persistence/database-connection';
import { DATABASE_CONNECTION } from 'src/persistence/database-connection.interface';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useClass: DatabaseConnection,
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
