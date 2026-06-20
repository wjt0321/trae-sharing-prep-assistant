import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ExportTypeEnum, ExportFormatEnum } from '@ai-task-manager/shared';

export class CreateExportDto {
  @IsEnum(ExportTypeEnum)
  type: ExportTypeEnum;

  @IsEnum(ExportFormatEnum)
  format: ExportFormatEnum;

  @IsOptional()
  @IsString()
  title?: string;
}
