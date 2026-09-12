import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { USER_REPOSITORY } from '../application/authentication/user.repository.interface';
import { UserRepository } from '../persistence/user.repository';
import { PASSWORD_HASHER } from '../application/authentication/password-hasher.interface';
import { PasswordHasher } from '../persistence/password-hasher';
import { AUTHENTICATION_SERVICE } from '../application/authentication/authentication.service.interface';
import { AuthenticationService } from '../application/authentication/authentication.service';
import { AuthenticationController } from '../controller/authentication/authentication.controller';

@Module({
  imports: [
    // No global secret/signOptions here — AuthenticationService reads
    // per-call secret/expiresIn from ConfigService itself (see
    // authentication.service.ts), so JwtModule only needs to be
    // importable for JwtService's injection token to exist.
    JwtModule.register({}),
  ],
  controllers: [AuthenticationController],
  providers: [
    // DATABASE_CONNECTION is provided globally by DatabaseModule (@Global())
    // — do not re-bind it here. UserRepository receives it automatically
    // via its own constructor injection, since Global modules make their
    // exports available app-wide without re-importing.
    { provide: USER_REPOSITORY, useClass: UserRepository },
    { provide: PASSWORD_HASHER, useClass: PasswordHasher },
    { provide: AUTHENTICATION_SERVICE, useClass: AuthenticationService },
  ],
  exports: [USER_REPOSITORY, PASSWORD_HASHER],
})
export class AuthenticationModule {}
