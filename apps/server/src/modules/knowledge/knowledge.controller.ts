import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { CreateTemplateDto } from './dto/knowledge.dto';
import { UpdateTemplateDto } from './dto/knowledge.dto';
import { CreateTemplateFromGoalDto } from './dto/knowledge.dto';
import { CreateAssetDto } from './dto/knowledge.dto';
import { UpdateAssetDto } from './dto/knowledge.dto';
import { CreateAssetFromExportDto } from './dto/knowledge.dto';
import { TemplateListQueryDto } from './dto/knowledge.dto';
import { AssetListQueryDto } from './dto/knowledge.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  // ============================================================
  // 模板 CRUD
  // ============================================================

  @Get('workspaces/:workspaceId/templates')
  findAllTemplates(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TemplateListQueryDto,
  ) {
    return this.knowledgeService.findAllTemplates(workspaceId, user.userId, query);
  }

  @Post('workspaces/:workspaceId/templates')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createTemplate(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.knowledgeService.createTemplate(workspaceId, user.userId, dto);
  }

  @Get('templates/:id')
  findOneTemplate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.knowledgeService.findOneTemplate(id, user.userId);
  }

  @Patch('templates/:id')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateTemplate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.knowledgeService.updateTemplate(id, user.userId, dto);
  }

  @Delete('templates/:id')
  removeTemplate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.knowledgeService.removeTemplate(id, user.userId);
  }

  // ============================================================
  // 从目标创建模板
  // ============================================================

  @Post('goals/:goalId/templates')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createTemplateFromGoal(
    @Param('goalId') goalId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTemplateFromGoalDto,
  ) {
    return this.knowledgeService.createTemplateFromGoal(goalId, user.userId, dto);
  }

  // ============================================================
  // 从模板创建目标（返回预填字段，前端灌入表单）
  // ============================================================

  @Get('templates/:id/for-goal')
  getTemplateForGoal(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.knowledgeService.getTemplateForGoal(id, user.userId);
  }

  // ============================================================
  // 知识资产 CRUD
  // ============================================================

  @Get('workspaces/:workspaceId/assets')
  findAllAssets(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AssetListQueryDto,
  ) {
    return this.knowledgeService.findAllAssets(workspaceId, user.userId, query);
  }

  @Post('workspaces/:workspaceId/assets')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createAsset(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAssetDto,
  ) {
    return this.knowledgeService.createAsset(workspaceId, user.userId, dto);
  }

  @Get('assets/:id')
  findOneAsset(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.knowledgeService.findOneAsset(id, user.userId);
  }

  @Patch('assets/:id')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateAsset(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.knowledgeService.updateAsset(id, user.userId, dto);
  }

  @Delete('assets/:id')
  removeAsset(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.knowledgeService.removeAsset(id, user.userId);
  }

  // ============================================================
  // 从导出沉淀为知识资产
  // ============================================================

  @Post('exports/:exportId/assets')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createAssetFromExport(
    @Param('exportId') exportId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAssetFromExportDto,
  ) {
    return this.knowledgeService.createAssetFromExport(exportId, user.userId, dto);
  }
}
