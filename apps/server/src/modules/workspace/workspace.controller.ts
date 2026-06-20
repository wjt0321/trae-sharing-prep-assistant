import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.workspaceService.findAll(user.userId);
  }

  @Post()
  create(@Body() dto: CreateWorkspaceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.workspaceService.create(dto, user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workspaceService.findOne(id, user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workspaceService.update(id, dto, user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workspaceService.remove(id, user.userId);
  }

  @Get(':id/members')
  findMembers(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workspaceService.findMembers(id, user.userId);
  }

  @Post(':id/members')
  inviteMember(
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workspaceService.inviteMember(id, dto, user.userId);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @Param('id') id: string,
    @Param('userId') memberUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workspaceService.removeMember(id, memberUserId, user.userId);
  }

  @Get(':id/invites')
  findInvites(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workspaceService.findInvites(id, user.userId);
  }

  @Post('invites/:token/accept')
  acceptInvite(
    @Param('token') token: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workspaceService.acceptInvite(token, user.userId);
  }
}
