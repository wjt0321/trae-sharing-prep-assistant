import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(goalId: string) {
    // TODO: 实现查询目标下的导出记录列表
    return [];
  }

  async create(goalId: string, dto: any) {
    // TODO: 实现生成导出逻辑（聚合任务、生成分享 token、写入记录）
    return null;
  }

  async findOne(id: string) {
    // TODO: 实现查询单个导出记录详情
    return null;
  }

  async findByShareToken(token: string) {
    // TODO: 实现通过分享 token 查询导出内容（公开访问入口）
    return null;
  }
}
