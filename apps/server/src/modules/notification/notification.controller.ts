import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { NotificationListQueryDto } from './dto/notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ============================================================
  // 通知查询
  // ============================================================

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: NotificationListQueryDto,
  ) {
    return this.notificationService.findAll(user.userId, query);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.getUnreadCount(user.userId);
  }

  // ============================================================
  // 标记已读 / 删除
  // ============================================================

  @Post(':id/read')
  markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.markAsRead(id, user.userId);
  }

  @Post('read-all')
  markAllAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.notificationService.markAllAsRead(user.userId, workspaceId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.remove(id, user.userId);
  }
}
