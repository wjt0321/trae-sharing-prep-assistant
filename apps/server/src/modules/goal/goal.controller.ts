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
import { GoalService } from './goal.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { DetectScenarioDto } from './dto/detect-scenario.dto';
import { NormalizeContextDto } from './dto/normalize-context.dto';

@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalController {
  constructor(private readonly goalService: GoalService) {}

  @Get()
  findAll(
    @Query('workspaceId') workspaceId: string,
    @Query('scenarioType') scenarioType?: string,
    @Query('currentStage') currentStage?: string,
    @Query('keyword') keyword?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.goalService.findAll(user!.userId, {
      workspaceId,
      scenarioType,
      currentStage,
      keyword,
    });
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreateGoalDto, @CurrentUser() user: AuthenticatedUser) {
    return this.goalService.create(dto, user.userId);
  }

  @Post('detect-scenario')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  detectScenario(@Body() dto: DetectScenarioDto) {
    return this.goalService.detectScenario(dto);
  }

  @Post('normalize-context')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  normalizeContext(@Body() dto: NormalizeContextDto) {
    return this.goalService.normalizeContext(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.goalService.findOne(id, user.userId);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.goalService.update(id, dto, user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.goalService.remove(id, user.userId);
  }
}
