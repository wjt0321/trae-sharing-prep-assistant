import { IsOptional, IsBoolean } from 'class-validator';

export class SyncTasksDto {
  @IsOptional()
  @IsBoolean()
  replace?: boolean;
}
