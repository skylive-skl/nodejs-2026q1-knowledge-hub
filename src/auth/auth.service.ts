import {
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { UserRole } from 'src/common/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ValidationError } from 'src/common/errors/validation.error';
import { ForbiddenError } from 'src/common/errors/forbidden.error';

type JwtPayload = {
  userId: string;
  login: string;
  role: UserRole;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getRefreshTokenExpiresAt(refreshToken: string): bigint {
    const decoded = this.jwtService.decode<{ exp?: number }>(refreshToken);
    if (decoded?.exp) {
      return BigInt(decoded.exp) * BigInt(1000);
    }

    return BigInt(Date.now()) + BigInt(7 * 24 * 60 * 60 * 1000);
  }

  private async saveRefreshToken(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = this.getRefreshTokenExpiresAt(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        token: tokenHash,
        userId,
        expiresAt,
      },
    });
  }

  private async generateTokenPair(payload: JwtPayload) {
    const accessToken = await this.jwtService.signAsync(payload);

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.getOrThrow('JWT_REFRESH_TTL'),
    });

    return { accessToken, refreshToken };
  }

  async signup(dto: SignupDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { login: dto.login },
      select: { id: true },
    });

    if (existingUser) {
      throw new ValidationError('Login is already taken');
    }

    return this.usersService.create({
      login: dto.login,
      password: dto.password,
      role: UserRole.VIEWER,
    });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { login: dto.login },
    });

    if (!user) {
      throw new ForbiddenError('Invalid login or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new ForbiddenError('Invalid login or password');
    }

    const payload: JwtPayload = {
      userId: user.id,
      login: user.login,
      role: user.role as UserRole,
    };

    const tokenPair = await this.generateTokenPair(payload);
    await this.saveRefreshToken(user.id, tokenPair.refreshToken);

    return tokenPair;
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new ForbiddenError('Invalid or expired refresh token');
    }

    const tokenHash = this.hashToken(refreshToken);

    const activeToken = await this.prisma.refreshToken.findFirst({
      where: {
        token: tokenHash,
        userId: payload.userId,
      },
      select: { id: true },
    });

    if (!activeToken) {
      throw new ForbiddenError('Refresh token is invalidated');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, login: true, role: true },
    });

    if (!user) {
      throw new ForbiddenError('Invalid or expired refresh token');
    }

    const freshPayload: JwtPayload = {
      userId: user.id,
      login: user.login,
      role: user.role as UserRole,
    };

    await this.prisma.refreshToken.delete({
      where: { id: activeToken.id },
    });

    const tokenPair = await this.generateTokenPair(freshPayload);
    await this.saveRefreshToken(user.id, tokenPair.refreshToken);

    return tokenPair;
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new ForbiddenError('Invalid or expired refresh token');
    }

    if (payload.userId !== userId) {
      throw new ForbiddenError('Refresh token does not belong to user');
    }

    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshToken.deleteMany({
      where: {
        token: tokenHash,
        userId,
      },
    });
  }
}
