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
import { WorkspaceService } from './workspace.service';

@Controller('workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get()
  findAll() {
    return this.workspaceService.findAll();
  }

  @Post()
  @UsePipes(ValidationPipe)
  create(@Body() dto: any) {
    return this.workspaceService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workspaceService.findOne(id);
  }

  @Patch(':id')
  @UsePipes(ValidationPipe)
  update(@Param('id') id: string, @Body() dto: any) {
    return this.workspaceService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workspaceService.remove(id);
  }

  @Get(':id/members')
  findMembers(@Param('id') id: string) {
    return this.workspaceService.findMembers(id);
  }

  @Post(':id/members')
  @UsePipes(ValidationPipe)
  inviteMember(@Param('id') id: string, @Body() dto: any) {
    return this.workspaceService.inviteMember(id, dto);
  }

  @Delete(':id/members/:userId')
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.workspaceService.removeMember(id, userId);
  }

  @Post(':id/invites')
  @UsePipes(ValidationPipe)
  createInvite(@Param('id') id: string, @Body() dto: any) {
    return this.workspaceService.inviteMember(id, dto);
  }
}
