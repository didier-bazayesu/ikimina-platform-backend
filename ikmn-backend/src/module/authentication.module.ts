// authentication.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { USER_REPOSITORY } from '../application/authentication/user.repository.interface';
import { UserRepository } from '../persistence/user.repository';
import { PASSWORD_HASHER } from '../application/authentication/password-hasher.interface';
import { PasswordHasher } from '../persistence/password-hasher';
import { TOKEN_HASHER } from '../application/authentication/token-hasher.interface';
import { TokenHasher } from '../persistence/token-hasher';
import { REFRESH_TOKEN_REPOSITORY } from '../application/authentication/refresh-token.repository.interface';
import { RefreshTokenRepository } from '../persistence/refresh-token.repository';
import { AUTHENTICATION_SERVICE } from '../application/authentication/authentication.service.interface';
import { AuthenticationService } from '../application/authentication/authentication.service';
import { AuthenticationController } from '../controller/authentication/authentication.controller';
import { JwtAuthGuard } from '../controller/authentication.guard';
import { RolesGuard } from 'src/controller/roles.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthenticationController],
  providers: [
    { provide: USER_REPOSITORY, useClass: UserRepository },
    { provide: PASSWORD_HASHER, useClass: PasswordHasher },
    { provide: TOKEN_HASHER, useClass: TokenHasher },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: RefreshTokenRepository },
    { provide: AUTHENTICATION_SERVICE, useClass: AuthenticationService },
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    USER_REPOSITORY,
    PASSWORD_HASHER,
    JwtAuthGuard,
    RolesGuard,
    JwtModule,
  ],
})
export class AuthenticationModule {}
