import { IsString, IsOptional, MinLength, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class DetectScenarioHintsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  audience?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  timeConstraint?: string;
}

export class DetectScenarioDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  topic: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DetectScenarioHintsDto)
  hints?: DetectScenarioHintsDto;
}
