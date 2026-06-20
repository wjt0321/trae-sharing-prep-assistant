import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ExportService } from './export.service';

@Controller()
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('goals/:goalId/exports')
  findAll(@Param('goalId') goalId: string) {
    return this.exportService.findAll(goalId);
  }

  @Post('goals/:goalId/exports')
  @UsePipes(ValidationPipe)
  create(@Param('goalId') goalId: string, @Body() dto: any) {
    return this.exportService.create(goalId, dto);
  }

  @Get('exports/:id')
  findOne(@Param('id') id: string) {
    return this.exportService.findOne(id);
  }

  @Get('shares/:token')
  findByShareToken(@Param('token') token: string) {
    return this.exportService.findByShareToken(token);
  }
}
