import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(goalId: string) {
    // TODO: 实现查询目标下的任务列表（支持按阶段、状态过滤）
    return [];
  }

  async findOne(id: string) {
    // TODO: 实现查询单个任务详情
    return null;
  }

  async create(goalId: string, dto: any) {
    // TODO: 实现创建任务逻辑
    return null;
  }

  async update(id: string, dto: any) {
    // TODO: 实现更新任务逻辑
    return null;
  }

  async remove(id: string) {
    // TODO: 实现删除任务逻辑
    return null;
  }

  async updateStatus(id: string, dto: any) {
    // TODO: 实现任务状态推进逻辑（校验状态机、记录变更）
    return null;
  }
}
