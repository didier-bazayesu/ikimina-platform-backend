import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { configureGlobalEnhancers, configureOpenAPI } from './setup-app';
import { MainModule } from './main.module';

async function bootstrap() {
  const port = Number.parseInt(process.env.PORT || '3000');
  const logger = new Logger();

  const app = await NestFactory.create(MainModule, {
    cors: true,
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
