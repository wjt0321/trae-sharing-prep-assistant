import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PlanningService } from './planning.service';

@Controller()
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @Get('goals/:goalId/plans')
  findAll(@Param('goalId') goalId: string) {
    return this.planningService.findAll(goalId);
  }

  @Post('goals/:goalId/plans')
  @UsePipes(ValidationPipe)
  create(@Param('goalId') goalId: string, @Body() dto: any) {
    return this.planningService.create(goalId, dto);
  }

  @Get('goals/:goalId/plans/active')
  findActive(@Param('goalId') goalId: string) {
    return this.planningService.findActive(goalId);
  }

  @Get('plans/:id')
  findOne(@Param('id') id: string) {
    return this.planningService.findOne(id);
  }

  @Post('goals/:goalId/replan')
  @UsePipes(ValidationPipe)
  replan(@Param('goalId') goalId: string, @Body() dto: any) {
    return this.planningService.replan(goalId, dto);
  }
}
