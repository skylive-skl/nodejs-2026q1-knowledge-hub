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
  BadRequestException,
} from '@nestjs/common';
import { RagService } from './rag.service';

interface ReindexRequest {
  onlyPublished?: boolean;
  articleIds?: string[];
}

interface RagSearchRequest {
  query: string;
  limit?: number;
  articleStatus?: 'draft' | 'published' | 'archived';
  categoryId?: string;
  tags?: string[];
}

interface RagChatRequest {
  question: string;
  conversationId?: string;
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
  async search(@Body() body: RagSearchRequest) {
    if (!body?.query) {
      throw new BadRequestException('query is missing');
    }
    return this.ragService.search(body.query, {
      limit: body.limit,
      articleStatus: body.articleStatus,
      categoryId: body.categoryId,
      tags: body.tags,
    });
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() body: RagChatRequest) {
    if (!body?.question) {
      throw new BadRequestException('question is missing');
    }
    return this.ragService.chat(body.question, body.conversationId);
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
    return this.ragService.getChatHistory(conversationId);
  }
}
