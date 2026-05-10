import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { AppLoggerService } from 'src/common/logger/app-logger.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeminiHttpClient } from '../gemini-http.client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RagService implements OnModuleInit {
  private qdrantClient: QdrantClient;
  private readonly collectionName: string;
  public readonly chunkSize: number;
  public readonly chunkOverlap: number;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: AppLoggerService,
    private readonly prisma: PrismaService,
    private readonly geminiClient: GeminiHttpClient,
  ) {
    this.collectionName =
      this.config.get<string>('RAG_VECTOR_COLLECTION') ??
      'knowledge_hub_articles';
    // Use fallback number instead of parsing env since NestJS config handles type casting based on env variables partially, but to be safe we parse
    const sizeEnv = this.config.get('RAG_CHUNK_SIZE');
    this.chunkSize = sizeEnv ? Number(sizeEnv) : 800;
    const overlapEnv = this.config.get('RAG_CHUNK_OVERLAP');
    this.chunkOverlap = overlapEnv ? Number(overlapEnv) : 200;

    const url =
      this.config.get<string>('RAG_VECTOR_DB_URL') ?? 'http://localhost:6333';
    this.qdrantClient = new QdrantClient({ url });
  }

  async onModuleInit() {
    await this.initVectorCollection();
  }

  private async initVectorCollection() {
    try {
      const collections = await this.qdrantClient.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === this.collectionName,
      );

      if (!exists) {
        this.logger.log(
          `Creating vector collection: ${this.collectionName}`,
          'RagService',
        );
        await this.qdrantClient.createCollection(this.collectionName, {
          vectors: {
            size: 768, // text-embedding-004 output size is 768
            distance: 'Cosine',
          },
        });
      } else {
        this.logger.log(
          `Vector collection ${this.collectionName} already exists`,
          'RagService',
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to initialize Qdrant collection: ${(error as Error).message}`,
        (error as Error).stack,
        'RagService',
      );
    }
  }

  chunkText(text: string): string[] {
    const chunks: string[] = [];
    if (!text) return chunks;

    let i = 0;
    while (i < text.length) {
      chunks.push(text.slice(i, i + this.chunkSize));
      if (i + this.chunkSize >= text.length) {
        break;
      }
      i += this.chunkSize - this.chunkOverlap;
    }

    return chunks;
  }

  async deleteArticleIndex(articleId: string): Promise<boolean> {
    try {
      const countResult = await this.qdrantClient.count(this.collectionName, {
        filter: {
          must: [{ key: 'articleId', match: { value: articleId } }],
        },
      });

      if (countResult.count === 0) {
        return false;
      }

      await this.qdrantClient.delete(this.collectionName, {
        filter: {
          must: [{ key: 'articleId', match: { value: articleId } }],
        },
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to delete index for article ${articleId}: ${(error as Error).message}`,
        (error as Error).stack,
        'RagService',
      );
      return false;
    }
  }

  async indexArticles(options?: { onlyPublished?: boolean; articleIds?: string[] }) {
    const onlyPublished = options?.onlyPublished ?? true;
    const articleIds = options?.articleIds;

    const where: any = {};
    if (onlyPublished) {
      where.status = 'published';
    }
    if (articleIds && articleIds.length > 0) {
      where.id = { in: articleIds };
    }

    const articles = await this.prisma.article.findMany({
      where,
      include: {
        tags: true,
      },
    });

    let totalIndexedChunks = 0;

    for (const article of articles) {
      await this.deleteArticleIndex(article.id);

      const textToChunk = `Title: ${article.title}\n\n${article.content}`;
      const chunks = this.chunkText(textToChunk);

      if (chunks.length === 0) continue;

      const points = [];
      const batchSize = 50;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const chunkBatch = chunks.slice(i, i + batchSize);
        const embeddings = await this.geminiClient.batchEmbedContents(chunkBatch);
        
        for (let j = 0; j < chunkBatch.length; j++) {
          points.push({
            id: uuidv4(),
            vector: embeddings[j],
            payload: {
              articleId: article.id,
              articleTitle: article.title,
              status: article.status,
              categoryId: article.categoryId,
              tags: article.tags.map((t) => t.name),
              chunk: chunkBatch[j],
              chunkIndex: i + j,
            },
          });
        }
      }

      await this.qdrantClient.upsert(this.collectionName, {
        wait: true,
        points: points,
      });

      totalIndexedChunks += chunks.length;
    }

    return {
      indexedArticles: articles.length,
      indexedChunks: totalIndexedChunks,
      vectorCollection: this.collectionName,
    };
  }
}
