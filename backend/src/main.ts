import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { appConfig, type AppConfig } from './core/config/app.config';
import { AllExceptionsFilter } from './core/http/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<AppConfig>(appConfig.KEY);

  app.setGlobalPrefix(config.globalPrefix);
  app.enableCors({ origin: config.corsOrigin });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(config.port);
  Logger.log(
    `${config.name} API escuchando en http://localhost:${config.port}/${config.globalPrefix}`,
    'Bootstrap',
  );
}

void bootstrap();
