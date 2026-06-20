import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ok } from '@ai-task-manager/shared';

/**
 * 响应拦截器
 * 统一成功响应结构为 { success, data, error, timestamp }
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<{ headers: Record<string, string> }>();
    const traceId = request.headers['x-trace-id'];

    return next.handle().pipe(
      map((data) => {
        // 如果已经是 ApiResponse 结构，直接返回
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }
        return ok(data, traceId);
      }),
    );
  }
}
