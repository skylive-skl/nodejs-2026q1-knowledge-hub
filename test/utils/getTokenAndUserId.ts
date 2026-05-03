import { authRoutes } from '../endpoints';
import promoteUserRole from './promoteUserRole';

const TEST_PASSWORD = 'Tu6!@#%&';

const createUniqueUserDto = () => ({
  // Unique login removes cross-suite collisions in sequential e2e runs.
  login: `TEST_AUTH_LOGIN_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  password: TEST_PASSWORD,
});

const getTokenAndUserId = async (request) => {
  const createUserDto = createUniqueUserDto();

  // create user (signup always yields a viewer per spec)
  const {
    body: { id: mockUserId },
  } = await request
    .post(authRoutes.signup)
    .set('Accept', 'application/json')
    .send(createUserDto);

  if (mockUserId === undefined) {
    throw new Error('Authorization is not implemented');
  }

  // promote directly in DB so base tests run as admin and can mutate
  await promoteUserRole(mockUserId, 'admin');

  // get token after promotion so the JWT payload role === 'admin'
  const {
    body: { accessToken, refreshToken },
  } = await request
    .post(authRoutes.login)
    .set('Accept', 'application/json')
    .send(createUserDto);

  if (accessToken === undefined) {
    throw new Error('Authorization is not implemented');
  }

  const token = `Bearer ${accessToken}`;

  return {
    token,
    accessToken,
    refreshToken,
    mockUserId,
    login: createUserDto.login,
  };
};

export default getTokenAndUserId;
