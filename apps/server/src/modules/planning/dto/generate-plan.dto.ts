import { IsOptional, IsBoolean } from 'class-validator';

export class GeneratePlanDto {
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
