import { StatusCodes } from 'http-status-codes';
import { request } from './lib';
import {
  getTokenAndUserId,
  shouldAuthorizationBeTested,
  removeTokenUser,
} from './utils';
import {
  articlesRoutes,
  categoriesRoutes,
  commentsRoutes,
  usersRoutes,
} from './endpoints';

describe('List Query (e2e)', () => {
  const unauthorizedRequest = request;
  const commonHeaders = { Accept: 'application/json' };
  let mockUserId: string | undefined;

  beforeAll(async () => {
    if (shouldAuthorizationBeTested) {
      const result = await getTokenAndUserId(unauthorizedRequest);
      commonHeaders['Authorization'] = result.token;
      mockUserId = result.mockUserId;
    }
  });

  afterAll(async () => {
    if (mockUserId) {
      await removeTokenUser(unauthorizedRequest, mockUserId, commonHeaders);
    }

    if (commonHeaders['Authorization']) {
      delete commonHeaders['Authorization'];
    }
  });

  it('should return BAD_REQUEST for page=0', async () => {
    const response = await unauthorizedRequest
      .get(`${articlesRoutes.getAll}?page=0`)
      .set(commonHeaders);

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return BAD_REQUEST for limit=101', async () => {
    const response = await unauthorizedRequest
      .get(`${articlesRoutes.getAll}?limit=101`)
      .set(commonHeaders);

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return BAD_REQUEST for invalid order', async () => {
    const response = await unauthorizedRequest
      .get(`${usersRoutes.getAll}?order=up`)
      .set(commonHeaders);

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return paginated response for categories', async () => {
    const response = await unauthorizedRequest
      .get(`${categoriesRoutes.getAll}?page=1&limit=2&sortBy=name&order=asc`)
      .set(commonHeaders);

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('page', 1);
    expect(response.body).toHaveProperty('limit', 2);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('should return paginated response for comments without articleId filter', async () => {
    const response = await unauthorizedRequest
      .get('/comment?page=1&limit=1&sortBy=createdAt&order=desc')
      .set(commonHeaders);

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('page', 1);
    expect(response.body).toHaveProperty('limit', 1);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('should keep backward compatibility and return array when pagination is not passed', async () => {
    const validNonExistentArticleId = '0a35dd62-e09f-444b-a628-f4e7c6954f57';

    const response = await unauthorizedRequest
      .get(commentsRoutes.getByArticle(validNonExistentArticleId))
      .set(commonHeaders);

    // UUID is valid, and endpoint should return array shape for non-paginated requests
    expect(response.status).toBe(StatusCodes.OK);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
