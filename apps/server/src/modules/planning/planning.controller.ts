import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PlanningService } from './planning.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { ReplanDto } from './dto/replan.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @Get('goals/:goalId/plans')
  findAll(@Param('goalId') goalId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.planningService.findAll(goalId, user.userId);
  }

  @Post('goals/:goalId/plans')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(
    @Param('goalId') goalId: string,
    @Body() dto: GeneratePlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.planningService.create(goalId, dto, user.userId);
  }

  @Get('goals/:goalId/plans/active')
  findActive(@Param('goalId') goalId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.planningService.findActive(goalId, user.userId);
  }

  @Get('goals/:goalId/plans/compare')
  compare(
    @Param('goalId') goalId: string,
    @Query('versionA') versionA: string,
    @Query('versionB') versionB: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.planningService.compare(
      goalId,
      Number(versionA),
      Number(versionB),
      user.userId,
    );
  }

  @Patch('goals/:goalId/plans/active')
  setActive(
    @Param('goalId') goalId: string,
    @Query('version') version: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.planningService.setActive(goalId, Number(version), user.userId);
  }

  @Get('plans/:id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.planningService.findOne(id, user.userId);
  }

  @Post('goals/:goalId/replan')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  replan(
    @Param('goalId') goalId: string,
    @Body() dto: ReplanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.planningService.replan(goalId, dto, user.userId);
  }
}
