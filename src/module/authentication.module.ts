import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from '../application/authentication/user.repository.interface';
import { UserRepository } from '../persistence/user.repository';
import { PASSWORD_HASHER } from '../application/authentication/password-hasher.interface';
import { PasswordHasher } from '../persistence/password-hasher';

@Module({
  providers: [
    // DATABASE_CONNECTION is provided globally by DatabaseModule (@Global())
    // — do not re-bind it here. UserRepository receives it automatically
    // via its own constructor injection, since Global modules make their
    // exports available app-wide without re-importing.
    { provide: USER_REPOSITORY, useClass: UserRepository },
    { provide: PASSWORD_HASHER, useClass: PasswordHasher },
  ],
  exports: [USER_REPOSITORY, PASSWORD_HASHER],
})
export class AuthenticationModule {}
