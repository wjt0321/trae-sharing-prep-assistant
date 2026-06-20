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
import { ExecutionService } from './execution.service';

@Controller()
export class ExecutionController {
  constructor(private readonly executionService: ExecutionService) {}

  @Get('goals/:goalId/tasks')
  findAll(@Param('goalId') goalId: string) {
    return this.executionService.findAll(goalId);
  }

  @Post('goals/:goalId/tasks')
  @UsePipes(ValidationPipe)
  create(@Param('goalId') goalId: string, @Body() dto: any) {
    return this.executionService.create(goalId, dto);
  }

  @Get('tasks/:id')
  findOne(@Param('id') id: string) {
    return this.executionService.findOne(id);
  }

  @Patch('tasks/:id')
  @UsePipes(ValidationPipe)
  update(@Param('id') id: string, @Body() dto: any) {
    return this.executionService.update(id, dto);
  }

  @Delete('tasks/:id')
  remove(@Param('id') id: string) {
    return this.executionService.remove(id);
  }

  @Patch('tasks/:id/status')
  @UsePipes(ValidationPipe)
  updateStatus(@Param('id') id: string, @Body() dto: any) {
    return this.executionService.updateStatus(id, dto);
  }
}
