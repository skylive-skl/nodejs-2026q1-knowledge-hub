import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiContent } from './types/gemini.types';
import { TtlCache } from './ttl-cache';

@Injectable()
export class AiSessionService {
  private readonly sessions: TtlCache<GeminiContent[]>;

  constructor(private readonly config: ConfigService) {
    const ttlSec = this.config.get<number>('AI_CACHE_TTL_SEC') ?? 300;
    this.sessions = new TtlCache<GeminiContent[]>(ttlSec * 1000);
  }

  getSession(sessionId: string): GeminiContent[] {
    return this.sessions.get(sessionId) ?? [];
  }

  setSession(sessionId: string, history: GeminiContent[]): void {
    this.sessions.set(sessionId, history);
  }
}
