import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthThrottlerGuard } from './guards/auth-throttler.guard';
import { UserEntity } from 'src/users/users.entity';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

const isThrottleDisabledForTests =
  process.env.TEST_MODE === 'auth' ||
  process.env.NODE_ENV === 'test' ||
  process.env.DISABLE_THROTTLE_FOR_TESTS === 'true';

const authThrottleGuards = isThrottleDisabledForTests
  ? []
  : [AuthThrottlerGuard];

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(...authThrottleGuards)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async signup(@Body() dto: SignupDto): Promise<UserEntity> {
    const user = await this.authService.signup(dto);
    return new UserEntity(user);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(...authThrottleGuards)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  login(
    @Body() dto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @Body() dto: RefreshDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!dto?.refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request, @Body() dto: RefreshDto): Promise<void> {
    const userId = (req.user as { userId: string }).userId;
    if (!dto?.refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    await this.authService.logout(userId, dto.refreshToken);
  }
}
