import { Controller, Post, Get, Patch, Body, UseGuards, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService, AuditMeta } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from './public.decorator';
import { CurrentUser } from './current-user.decorator';
import type { AuthenticatedUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthCookieUtil } from './auth-cookies.util';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 从请求中提取审计元信息（IP / UA / method / path）
   */
  private extractAuditMeta(req: Request): AuditMeta {
    return {
      ipAddress: req.ip ?? req.socket?.remoteAddress ?? null,
      userAgent: req.headers['user-agent'] ?? null,
      method: req.method,
      path: req.originalUrl ?? req.url,
    };
  }

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.register(dto, this.extractAuditMeta(req)).then((result) => {
      AuthCookieUtil.setAuthCookies(res, result, this.configService);
      return result;
    });
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, this.extractAuditMeta(req)).then((result) => {
      AuthCookieUtil.setAuthCookies(res, result, this.configService);
      return result;
    });
  }

  @Public()
  @Post('refresh')
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // 优先从 Cookie 读取 refresh token，向后兼容 body
    const refreshToken = AuthCookieUtil.getRefreshTokenFromRequest(req);
    const dto: RefreshDto = { refreshToken: refreshToken ?? '' };
    return this.authService.refresh(dto).then((result) => {
      AuthCookieUtil.setAuthCookies(res, result, this.configService);
      return result;
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getCurrentUser(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateProfile(
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.authService.updateProfile(
      user.userId,
      dto,
      this.extractAuditMeta(req),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.authService.changePassword(
      user.userId,
      dto,
      this.extractAuditMeta(req),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.logout(user.userId, this.extractAuditMeta(req)).then((result) => {
      AuthCookieUtil.clearAuthCookies(res);
      return result;
    });
  }
}
