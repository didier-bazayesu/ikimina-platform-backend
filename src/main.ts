import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { join } from 'path';
import { configureGlobalEnhancers, configureOpenAPI } from './setup-app';
import { MainModule } from './main.module';

async function bootstrap() {
  const port = Number.parseInt(process.env.PORT || '3000');
  const logger = new Logger();

  const app = await NestFactory.create<NestExpressApplication>(MainModule);

  app.use(helmet());
  app.enableCors({ origin: process.env.CORS_ORIGIN || '*' });
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  configureOpenAPI(app);
  configureGlobalEnhancers(app);

  await app.init();
  await app.listen(port);

  logger.log(`Server is listening on port ${port}`);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
