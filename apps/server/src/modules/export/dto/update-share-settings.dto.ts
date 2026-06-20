import { IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class UpdateShareSettingsDto {
  @IsOptional()
  @IsBoolean()
  enableShare?: boolean;

  @IsOptional()
  @IsDateString()
  shareExpiresAt?: string | null;

  @IsOptional()
  @IsBoolean()
  allowDownload?: boolean;
}
