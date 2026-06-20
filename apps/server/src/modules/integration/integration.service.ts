import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    // TODO: 实现查询集成配置列表（外部通知、webhook 等）
    return [];
  }

  async create(dto: any) {
    // TODO: 实现创建集成配置逻辑
    return null;
  }

  async remove(id: string) {
    // TODO: 实现删除集成配置逻辑
    return null;
  }

  async test(dto: any) {
    // TODO: 实现集成连通性测试逻辑（发送测试 webhook / 通知）
    return null;
  }
}
