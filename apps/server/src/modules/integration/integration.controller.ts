import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Get()
  findAll() {
    return this.integrationService.findAll();
  }

  @Post()
  @UsePipes(ValidationPipe)
  create(@Body() dto: any) {
    return this.integrationService.create(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.integrationService.remove(id);
  }

  @Post('test')
  @UsePipes(ValidationPipe)
  test(@Body() dto: any) {
    return this.integrationService.test(dto);
  }
}
