import { Controller, Post, Get, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UsePipes(ValidationPipe)
  register(@Body() dto: any) {
    return this.authService.register(dto);
  }

  @Post('login')
  @UsePipes(ValidationPipe)
  login(@Body() dto: any) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @UsePipes(ValidationPipe)
  refresh(@Body() dto: any) {
    return this.authService.refresh(dto);
  }

  @Get('me')
  getCurrentUser() {
    return this.authService.getCurrentUser();
  }

  @Post('logout')
  logout() {
    return this.authService.logout();
  }
}
