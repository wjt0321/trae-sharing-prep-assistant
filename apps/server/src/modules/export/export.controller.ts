import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { CreateExportDto } from './dto/create-export.dto';
import { UpdateShareSettingsDto } from './dto/update-share-settings.dto';

@Controller()
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  // ============================================================
  // 导出记录管理（鉴权）
  // ============================================================

  @Get('goals/:goalId/exports')
  @UseGuards(JwtAuthGuard)
  findAll(@Param('goalId') goalId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.exportService.findAll(goalId, user.userId);
  }

  @Post('goals/:goalId/exports')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(
    @Param('goalId') goalId: string,
    @Body() dto: CreateExportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.exportService.create(goalId, dto, user.userId);
  }

  @Get('exports/:id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.exportService.findOne(id, user.userId);
  }

  @Delete('exports/:id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.exportService.remove(id, user.userId);
  }

  // ============================================================
  // 分享设置管理（鉴权）
  // ============================================================

  @Patch('exports/:id/share')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateShareSettings(
    @Param('id') id: string,
    @Body() dto: UpdateShareSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.exportService.updateShareSettings(id, dto, user.userId);
  }

  // ============================================================
  // 下载 Markdown 文件（鉴权）
  // ============================================================

  @Get('exports/:id/download')
  @UseGuards(JwtAuthGuard)
  async download(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const record = await this.exportService.findOne(id, user.userId);
    const filename = `${record.title}.md`;
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );
    res.send(record.content);
  }

  // ============================================================
  // 共享页（公开访问，无需登录）
  // ============================================================

  @Get('shares/:token')
  @Public()
  findByShareToken(@Param('token') token: string) {
    return this.exportService.findByShareToken(token);
  }
}
