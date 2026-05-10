import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { AppLoggerService } from 'src/common/logger/app-logger.service';

@Injectable()
export class RagService implements OnModuleInit {
  private qdrantClient: QdrantClient;
  private readonly collectionName: string;
  public readonly chunkSize: number;
  public readonly chunkOverlap: number;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: AppLoggerService,
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
}
