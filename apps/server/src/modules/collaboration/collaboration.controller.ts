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
import { CollaborationService } from './collaboration.service';

@Controller()
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Get('goals/:goalId/comments')
  findAll(@Param('goalId') goalId: string) {
    return this.collaborationService.findAll(goalId);
  }

  @Post('goals/:goalId/comments')
  @UsePipes(ValidationPipe)
  create(@Param('goalId') goalId: string, @Body() dto: any) {
    return this.collaborationService.create(goalId, dto);
  }

  @Patch('comments/:id')
  @UsePipes(ValidationPipe)
  update(@Param('id') id: string, @Body() dto: any) {
    return this.collaborationService.update(id, dto);
  }

  @Delete('comments/:id')
  remove(@Param('id') id: string) {
    return this.collaborationService.remove(id);
  }

  @Post('comments/:id/resolve')
  resolve(@Param('id') id: string) {
    return this.collaborationService.resolve(id);
  }
}
