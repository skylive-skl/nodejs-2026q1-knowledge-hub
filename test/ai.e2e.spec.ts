import { request } from './lib';
import { StatusCodes } from 'http-status-codes';
import {
  getTokenAndUserId,
  shouldAuthorizationBeTested,
  removeTokenUser,
} from './utils';
import { aiRoutes, articlesRoutes } from './endpoints';

const randomUUID = '0a35dd62-e09f-444b-a628-f4e7c6954f57';

const createArticleDto = {
  title: 'AI_TEST_ARTICLE',
  content: 'Content used for AI integration tests.',
  status: 'draft',
  authorId: null,
  categoryId: null,
  tags: [],
};

describe('AI endpoints (e2e)', () => {
  const unauthorizedRequest = request;
  const commonHeaders: Record<string, string> = { Accept: 'application/json' };
  let mockUserId: string | undefined;
  let testArticleId: string | undefined;

  beforeAll(async () => {
    if (shouldAuthorizationBeTested) {
      const result = await getTokenAndUserId(unauthorizedRequest);
      commonHeaders['Authorization'] = result.token;
      mockUserId = result.mockUserId;
    }

    // Create an article to use in AI endpoint tests
    const articleResponse = await unauthorizedRequest
      .post(articlesRoutes.create)
      .set(commonHeaders)
      .send(createArticleDto);

    if (articleResponse.statusCode === StatusCodes.CREATED) {
      testArticleId = articleResponse.body.id;
    }
  });

  afterAll(async () => {
    if (testArticleId) {
      await unauthorizedRequest
        .delete(articlesRoutes.delete(testArticleId))
        .set(commonHeaders);
    }

    if (mockUserId) {
      await removeTokenUser(unauthorizedRequest, mockUserId, commonHeaders);
    }
  });

  // ─── Auth guard ──────────────────────────────────────────────────────────

  describe('Unauthorized access', () => {
    it('GET /ai/articles/:id/summarize returns 401 without token', async () => {
      const response = await unauthorizedRequest
        .post(aiRoutes.summarize(randomUUID))
        .set({ Accept: 'application/json' });

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });

    it('GET /ai/articles/:id/translate returns 401 without token', async () => {
      const response = await unauthorizedRequest
        .post(aiRoutes.translate(randomUUID))
        .set({ Accept: 'application/json' });

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });

    it('GET /ai/articles/:id/analyze returns 401 without token', async () => {
      const response = await unauthorizedRequest
        .post(aiRoutes.analyze(randomUUID))
        .set({ Accept: 'application/json' });

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });
  });

  // ─── 404 Not Found ───────────────────────────────────────────────────────

  describe('Article not found', () => {
    it('summarize returns 404 for non-existent article', async () => {
      const response = await unauthorizedRequest
        .post(aiRoutes.summarize(randomUUID))
        .set(commonHeaders)
        .send({});

      expect(response.status).toBe(StatusCodes.NOT_FOUND);
    });

    it('translate returns 404 for non-existent article', async () => {
      const response = await unauthorizedRequest
        .post(aiRoutes.translate(randomUUID))
        .set(commonHeaders)
        .send({ targetLanguage: 'ru' });

      expect(response.status).toBe(StatusCodes.NOT_FOUND);
    });

    it('analyze returns 404 for non-existent article', async () => {
      const response = await unauthorizedRequest
        .post(aiRoutes.analyze(randomUUID))
        .set(commonHeaders)
        .send({});

      expect(response.status).toBe(StatusCodes.NOT_FOUND);
    });
  });

  // ─── 400 Validation ──────────────────────────────────────────────────────

  describe('Validation errors', () => {
    it('translate returns 400 when targetLanguage is missing', async () => {
      if (!testArticleId) {
        console.warn('Skipping: no testArticleId available');
        return;
      }

      const response = await unauthorizedRequest
        .post(aiRoutes.translate(testArticleId))
        .set(commonHeaders)
        .send({});

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });

    it('translate returns 400 when targetLanguage is empty string', async () => {
      if (!testArticleId) return;

      const response = await unauthorizedRequest
        .post(aiRoutes.translate(testArticleId))
        .set(commonHeaders)
        .send({ targetLanguage: '' });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });

    it('summarize returns 400 for invalid maxLength value', async () => {
      if (!testArticleId) return;

      const response = await unauthorizedRequest
        .post(aiRoutes.summarize(testArticleId))
        .set(commonHeaders)
        .send({ maxLength: 'superlong' });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });

    it('analyze returns 400 for invalid task value', async () => {
      if (!testArticleId) return;

      const response = await unauthorizedRequest
        .post(aiRoutes.analyze(testArticleId))
        .set(commonHeaders)
        .send({ task: 'invalid-task' });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });

    it('summarize returns 400 for invalid articleId format', async () => {
      const response = await unauthorizedRequest
        .post(aiRoutes.summarize('not-a-uuid'))
        .set(commonHeaders)
        .send({});

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });
  });
});
