// authentication.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { USER_REPOSITORY } from '../application/authentication/user.repository.interface';
import { UserRepository } from '../persistence/user.repository';
import { PASSWORD_HASHER } from '../application/authentication/password-hasher.interface';
import { PasswordHasher } from '../persistence/password-hasher';
import { AUTHENTICATION_SERVICE } from '../application/authentication/authentication.service.interface';
import { AuthenticationService } from '../application/authentication/authentication.service';
import { AuthenticationController } from '../controller/authentication/authentication.controller';
import { JwtAuthGuard } from '../controller/authentication.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthenticationController],
  providers: [
    { provide: USER_REPOSITORY, useClass: UserRepository },
    { provide: PASSWORD_HASHER, useClass: PasswordHasher },
    { provide: AUTHENTICATION_SERVICE, useClass: AuthenticationService },
    JwtAuthGuard,
  ],
  exports: [USER_REPOSITORY, PASSWORD_HASHER, JwtAuthGuard],
})
export class AuthenticationModule {}
