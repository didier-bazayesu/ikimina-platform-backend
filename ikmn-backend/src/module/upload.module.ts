import { Module } from '@nestjs/common';
import { UploadController } from '../controller/upload/upload.controller';
import { AuthenticationModule } from './authentication.module';

@Module({
  imports: [AuthenticationModule],
  controllers: [UploadController],
  exports: [],
})
export class UploadModule {}
