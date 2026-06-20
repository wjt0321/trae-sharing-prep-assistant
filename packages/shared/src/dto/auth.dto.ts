/**
 * 认证 DTO
 * 参考：02_账号工作区与权限基础实施清单.md
 */
export interface RegisterRequestDto {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface AuthTokenResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface currentUserResponseDto {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  defaultWorkspaceId: string;
}
