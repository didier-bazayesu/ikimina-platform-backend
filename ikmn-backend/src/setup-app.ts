import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import {
  NotFoundExceptionFilter,
  AccessDeniedExceptionFilter,
  ValidationExceptionFilter,
  HttpExceptionFilter,
  UnhandledExceptionFilter,
} from './controller';
import { ResponseInterceptor } from './controller/response.interceptor';

export function configureOpenAPI(app: INestApplication): INestApplication {
  const config = new DocumentBuilder()
    .setTitle('Gents Ikimina')
    .setDescription('The Gents Ikimina Investment Management System API')
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      bearerFormat: 'JWT',
    })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  return app;
}

export function configureGlobalEnhancers(
  app: INestApplication,
): INestApplication {
  return (
    app
      .useGlobalInterceptors(new ResponseInterceptor())
      .useGlobalPipes(
        new ValidationPipe({
          transform: true,
          whitelist: true,
          forbidNonWhitelisted: true,
          forbidUnknownValues: true,
        }),
      )
      // Nest resolves custom filters in reverse registration order. Register
      // the catch-all first so typed filters get the first chance to handle
      // their exceptions.
      .useGlobalFilters(
        new UnhandledExceptionFilter(),
        new HttpExceptionFilter(),
        new ValidationExceptionFilter(),
        new AccessDeniedExceptionFilter(),
        new NotFoundExceptionFilter(),
      )
      .enableShutdownHooks()
  );
}
