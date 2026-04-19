import { authRoutes } from '../endpoints';
import promoteUserRole from './promoteUserRole';
import { randomUUID } from 'crypto';

const getUserTokenByRole = async (
  request,
  role: 'admin' | 'editor' | 'viewer',
  // kept for signature compatibility with existing RBAC specs; unused now
  // because role promotion happens directly via Prisma
  _adminHeaders?: Record<string, string>,
) => {
  const login = `TEST_RBAC_${role.toUpperCase()}_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const password = 'TestPass123!';

  // Create user via signup (defaults to viewer)
  const signupResponse = await request
    .post(authRoutes.signup)
    .set({ Accept: 'application/json' })
    .send({ login, password });

  const { id: userId } = signupResponse.body;

  if (!userId) {
    throw new Error(
      `Failed to create ${role} user: status=${signupResponse.status}, body=${JSON.stringify(signupResponse.body)}`,
    );
  }

  if (role !== 'viewer') {
    await promoteUserRole(userId, role);
  }

  // Login AFTER promotion so JWT payload carries the correct role
  const loginResponse = await request
    .post(authRoutes.login)
    .set({ Accept: 'application/json' })
    .send({ login, password });

  const { accessToken } = loginResponse.body;

  if (!accessToken) {
    throw new Error(
      `Failed to login as ${role} user: status=${loginResponse.status}, body=${JSON.stringify(loginResponse.body)}`,
    );
  }

  return {
    token: `Bearer ${accessToken}`,
    userId,
    login,
    role,
  };
};

export default getUserTokenByRole;
