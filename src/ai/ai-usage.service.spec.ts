import { Test, TestingModule } from '@nestjs/testing';
import { AiUsageService } from './ai-usage.service';

describe('AiUsageService', () => {
  let service: AiUsageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiUsageService],
    }).compile();

    service = module.get<AiUsageService>(AiUsageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('starts with zero stats', () => {
    const stats = service.getStats();
    expect(stats.totalRequests).toBe(0);
    expect(stats.byEndpoint).toEqual({});
    expect(stats.tokenUsage.totalTokens).toBe(0);
  });

  it('increments totalRequests on each record', () => {
    service.record('summarize');
    service.record('translate');
    expect(service.getStats().totalRequests).toBe(2);
  });

  it('tracks requests by endpoint', () => {
    service.record('summarize');
    service.record('summarize');
    service.record('analyze');

    const stats = service.getStats();
    expect(stats.byEndpoint['summarize']).toBe(2);
    expect(stats.byEndpoint['analyze']).toBe(1);
  });

  it('accumulates token usage', () => {
    service.record('summarize', { prompt: 10, completion: 5, total: 15 });
    service.record('translate', { prompt: 20, completion: 10, total: 30 });

    const stats = service.getStats();
    expect(stats.tokenUsage.totalPrompt).toBe(30);
    expect(stats.tokenUsage.totalCompletion).toBe(15);
    expect(stats.tokenUsage.totalTokens).toBe(45);
  });

  it('handles record without token usage', () => {
    service.record('analyze');
    const stats = service.getStats();
    expect(stats.tokenUsage.totalTokens).toBe(0);
  });

  it('returns a snapshot (not mutable reference)', () => {
    service.record('summarize');
    const stats = service.getStats();
    stats.byEndpoint['summarize'] = 999;

    expect(service.getStats().byEndpoint['summarize']).toBe(1);
  });
});
