import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditLogQueryDto, AuditStatsQueryDto } from './dto/audit-query.dto';

/**
 * 审计日志控制器
 * 参考：12_安全监控指标与发布治理实施清单.md §1
 *
 * 仅登录用户可访问（生产环境应进一步限制为 admin/owner 角色）
 */
@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * 查询审计日志（分页 + 筛选）
   */
  @Get()
  findAll(@Query() query: AuditLogQueryDto) {
    return this.auditService.findAll(query);
  }

  /**
   * 查询单条审计日志
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const item = await this.auditService.findOne(id);
    if (!item) {
      throw new BadRequestException('审计日志不存在');
    }
    return item;
  }

  /**
   * 审计统计
   */
  @Get('stats/summary')
  getStats(@Query() query: AuditStatsQueryDto) {
    return this.auditService.getStats(query.days ?? 7);
  }
}
