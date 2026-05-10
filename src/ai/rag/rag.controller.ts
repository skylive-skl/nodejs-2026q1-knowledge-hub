import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { RagService } from './rag.service';

interface ReindexRequest {
  onlyPublished?: boolean;
  articleIds?: string[];
}

@Controller('ai/rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('index')
  @HttpCode(HttpStatus.OK)
  async indexData(@Body() body: ReindexRequest) {
    return this.ragService.indexArticles({
      onlyPublished: body?.onlyPublished,
      articleIds: body?.articleIds,
    });
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  async search(@Body() body: any) {
    return { results: [] };
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() body: any) {
    return { answer: 'Scaffold answer', sources: [], conversationId: 'scaffold' };
  }

  @Delete('index/articles/:articleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteArticleIndex(@Param('articleId') articleId: string) {
    const success = await this.ragService.deleteArticleIndex(articleId);
    if (!success) {
      throw new NotFoundException('Article/index entries not found');
    }
  }

  @Get('chat/:conversationId/history')
  async getChatHistory(@Param('conversationId') conversationId: string) {
    return [];
  }
}
