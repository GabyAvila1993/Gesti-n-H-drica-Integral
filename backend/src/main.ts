import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle(`${config.name} — API`)
    .setDescription(
      'Documentación interactiva OpenAPI 3.0 para la plataforma de monitoreo, prevención y alerta de riesgos hídricos del Gran Mendoza (monitoreo satelital MNDWI de canales de riego, visión artificial de acequias urbanas y dashboard unificado).',
    )
    .setVersion('1.0.0')
    .addTag('Dashboard Central', 'Métricas consolidadas, listado unificado de incidentes y capas geográficas')
    .addTag('Monitoreo Satelital', 'Canales matrices/hijuelas y detección de fugas por índice MNDWI')
    .addTag('Acequias Urbanas', 'Análisis fotográfico con IA y registro de alertas de obstrucción')
    .addTag('Salud del Sistema', 'Estado operativo de la API y proveedores configurados')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${config.globalPrefix}/docs`, app, document, {
    customSiteTitle: `${config.name} · OpenAPI Docs`,
  });

  await app.listen(config.port);
  Logger.log(
    `${config.name} API escuchando en http://localhost:${config.port}/${config.globalPrefix}`,
    'Bootstrap',
  );
  Logger.log(
    `Documentación Swagger disponible en http://localhost:${config.port}/${config.globalPrefix}/docs`,
    'Bootstrap',
  );
}

void bootstrap();
