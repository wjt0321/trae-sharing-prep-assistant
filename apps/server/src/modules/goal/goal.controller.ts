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
import { GoalService } from './goal.service';

@Controller('goals')
export class GoalController {
  constructor(private readonly goalService: GoalService) {}

  @Get()
  findAll() {
    return this.goalService.findAll();
  }

  @Post()
  @UsePipes(ValidationPipe)
  create(@Body() dto: any) {
    return this.goalService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.goalService.findOne(id);
  }

  @Patch(':id')
  @UsePipes(ValidationPipe)
  update(@Param('id') id: string, @Body() dto: any) {
    return this.goalService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.goalService.remove(id);
  }
}
