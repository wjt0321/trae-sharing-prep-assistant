import { IsString, MinLength, MaxLength, IsIn, IsOptional } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name: string;

  @IsIn(['personal', 'team'])
  type: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  description?: string;
}
