import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async register(dto: any) {
    // TODO: 实现注册逻辑（bcrypt 加密密码、创建用户记录、生成 token）
    return null;
  }

  async login(dto: any) {
    // TODO: 实现登录逻辑（校验密码、生成 access/refresh token）
    return null;
  }

  async refresh(dto: any) {
    // TODO: 实现 token 刷新逻辑（校验 refresh token、签发新 token）
    return null;
  }

  async getCurrentUser() {
    // TODO: 实现获取当前登录用户信息逻辑
    return null;
  }

  async logout() {
    // TODO: 实现登出逻辑（吊销 refresh token）
    return null;
  }
}
