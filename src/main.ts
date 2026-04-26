import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';

// Prisma returns BigInt for BigInt columns; convert to Number for JSON serialization.
// Date.now() values (~1.7e12) are well within Number.MAX_SAFE_INTEGER (~9e15).
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { join } from 'node:path';
import * as yaml from 'js-yaml';
import { SwaggerModule } from '@nestjs/swagger';
import { readFileSync } from 'node:fs';
import { AppLoggerService } from './common/logger/app-logger.service';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(AppLoggerService));

  const yamlPath = join(process.cwd(), '/doc/api.yaml');
  const fileContent = readFileSync(yamlPath, 'utf8');
  const document = yaml.load(fileContent) as any;
  SwaggerModule.setup('doc', app, document);

  // app.setGlobalPrefix('');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(
    app.get(LoggingInterceptor),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );
  app.useGlobalFilters(app.get(AllExceptionsFilter));
  await app.listen(process.env.PORT || 4000);
}
bootstrap();
