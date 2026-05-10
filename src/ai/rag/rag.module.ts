import { Module } from '@nestjs/common';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { AiModule } from '../ai.module';
import { AppLoggerService } from 'src/common/logger/app-logger.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [AiModule, PrismaModule],
  controllers: [RagController],
  providers: [RagService, AppLoggerService],
  exports: [RagService],
})
export class RagModule {}
