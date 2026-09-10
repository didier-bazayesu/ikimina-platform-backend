import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import {
  NotFoundExceptionFilter,
  AccessDeniedExceptionFilter,
  ValidationExceptionFilter,
  HttpExceptionFilter,
  UnhandledExceptionFilter,
} from './controller';

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
      .useGlobalPipes(
        new ValidationPipe({
          transform: true,
          whitelist: true,
          forbidNonWhitelisted: true,
          forbidUnknownValues: true,
        }),
      )
      // Order matters: most specific first, catch-all last. NestJS matches
      // @Catch() filters against a thrown exception's type — a broader
      // filter registered earlier would swallow exceptions a more specific
      // filter further down was meant to handle.
      .useGlobalFilters(
        new NotFoundExceptionFilter(),
        new AccessDeniedExceptionFilter(),
        new ValidationExceptionFilter(),
        new HttpExceptionFilter(),
        new UnhandledExceptionFilter(),
      )
      .enableShutdownHooks()
  );
}
