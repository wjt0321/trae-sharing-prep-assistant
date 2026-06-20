import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PromptRegistryService } from './prompt-registry.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreatePromptTemplateInputDto,
  UpdatePromptTemplateInputDto,
  RenderPromptInputDto,
} from './dto/prompt-template-input.dto';

/**
 * 提示词模板接口（Prompt Registry）
 *
 * 所有接口需登录访问。
 * 按 name 索引，支持版本管理。
 */
@Controller('prompts')
@UseGuards(JwtAuthGuard)
export class PromptRegistryController {
  constructor(private readonly promptRegistryService: PromptRegistryService) {}

  /** 列出所有活跃模板 */
  @Get()
  list() {
    return this.promptRegistryService.listActive();
  }

  /** 列出某 name 的所有版本 */
  @Get('versions')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  listVersions(@Query('name') name: string) {
    return this.promptRegistryService.listVersions(name);
  }

  /** 按 name 获取当前活跃版本 */
  @Get('by-name/:name')
  getByName(@Param('name') name: string) {
    return this.promptRegistryService.getActiveByName(name);
  }

  /** 按 id 获取 */
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.promptRegistryService.getById(id);
  }

  /** 创建模板（若 name 已存在则创建新版本） */
  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreatePromptTemplateInputDto) {
    return this.promptRegistryService.create(dto);
  }

  /** 更新模板（创建新版本） */
  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(@Param('id') id: string, @Body() dto: UpdatePromptTemplateInputDto) {
    return this.promptRegistryService.update(id, dto);
  }

  /** 激活指定版本 */
  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.promptRegistryService.activate(id);
  }

  /** 渲染预览 */
  @Post('by-name/:name/render')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  render(@Param('name') name: string, @Body() dto: RenderPromptInputDto) {
    return this.promptRegistryService.render(name, dto.variables);
  }

  /** 删除指定版本 */
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.promptRegistryService.delete(id);
  }
}
