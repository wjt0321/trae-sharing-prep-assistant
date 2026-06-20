import { IsEmail, IsIn, IsOptional } from 'class-validator';

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsIn(['owner', 'admin', 'editor', 'viewer'])
  role: string;
}

export class AcceptInviteDto {
  @IsOptional()
  @IsIn(['owner', 'admin', 'editor', 'viewer'])
  role?: string;
}
