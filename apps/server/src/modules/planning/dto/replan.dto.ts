import { IsString, IsOptional, MinLength, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ConstraintChangesDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  timeConstraint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  resourceConstraint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  successCriteria?: string;
}

export class ReplanDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConstraintChangesDto)
  constraintChanges?: ConstraintChangesDto;
}
