import { IsString, MinLength, MaxLength, IsOptional, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  displayName?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  @MaxLength(512)
  avatarUrl?: string;
}
