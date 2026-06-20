import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';

@Controller()
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get('workspaces/:workspaceId/templates')
  findAllTemplates(@Param('workspaceId') workspaceId: string) {
    return this.knowledgeService.findAllTemplates(workspaceId);
  }

  @Post('workspaces/:workspaceId/templates')
  @UsePipes(ValidationPipe)
  createTemplate(@Param('workspaceId') workspaceId: string, @Body() dto: any) {
    return this.knowledgeService.createTemplate(workspaceId, dto);
  }

  @Get('templates/:id')
  findOneTemplate(@Param('id') id: string) {
    return this.knowledgeService.findOneTemplate(id);
  }

  @Patch('templates/:id')
  @UsePipes(ValidationPipe)
  updateTemplate(@Param('id') id: string, @Body() dto: any) {
    return this.knowledgeService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  removeTemplate(@Param('id') id: string) {
    return this.knowledgeService.removeTemplate(id);
  }

  @Get('workspaces/:workspaceId/assets')
  findAllAssets(@Param('workspaceId') workspaceId: string) {
    return this.knowledgeService.findAllAssets(workspaceId);
  }

  @Post('workspaces/:workspaceId/assets')
  @UsePipes(ValidationPipe)
  createAsset(@Param('workspaceId') workspaceId: string, @Body() dto: any) {
    return this.knowledgeService.createAsset(workspaceId, dto);
  }

  @Get('assets/:id')
  findOneAsset(@Param('id') id: string) {
    return this.knowledgeService.findOneAsset(id);
  }

  @Patch('assets/:id')
  @UsePipes(ValidationPipe)
  updateAsset(@Param('id') id: string, @Body() dto: any) {
    return this.knowledgeService.updateAsset(id, dto);
  }

  @Delete('assets/:id')
  removeAsset(@Param('id') id: string) {
    return this.knowledgeService.removeAsset(id);
  }
}
