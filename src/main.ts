import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { join } from 'node:path';
import * as yaml from 'js-yaml';
import { SwaggerModule } from '@nestjs/swagger';
import { readFileSync } from 'node:fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  await app.listen(process.env.PORT || 4000);
}
bootstrap();
