import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { UsersModule } from './users/users.module';
import { ArticleModule } from './article/article.module';
import { CategoryModule } from './category/category.module';
import { CommentModule } from './comment/comment.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';
import { AppLoggerService } from './common/logger/app-logger.service';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
        skipIf: () => process.env.DISABLE_THROTTLE_FOR_TESTS === 'true',
      },
    ]),
    PrismaModule,
    UsersModule,
    ArticleModule,
    CategoryModule,
    CommentModule,
    AiModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AppLoggerService,
    LoggingInterceptor,
    AllExceptionsFilter,
  ],
})
export class AppModule {}
