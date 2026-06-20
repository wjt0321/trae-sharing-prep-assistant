import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiError } from '@ai-task-manager/shared';

/**
 * 全局异常过滤器
 * 统一错误响应结构，参考 @ai-task-manager/shared 的 ApiResponse
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let payload: { code: string; message: string; details?: unknown; fieldErrors?: Record<string, string[]> };

    if (exception instanceof ApiError) {
      status = exception.status;
      payload = exception.toPayload();
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      if (typeof resp === 'string') {
        payload = { code: exception.name, message: resp };
      } else if (typeof resp === 'object' && resp !== null) {
        const r = resp as Record<string, unknown>;
        payload = {
          code: (r.code as string) ?? exception.name,
          message: (r.message as string) ?? exception.message,
          fieldErrors: r.message as Record<string, string[]> | undefined,
        };
      } else {
        payload = { code: exception.name, message: exception.message };
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      payload = { code: 'INTERNAL_ERROR', message: exception.message };
      this.logger.error(`未处理的异常: ${exception.message}`, exception.stack);
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      payload = { code: 'INTERNAL_ERROR', message: '服务器内部错误' };
      this.logger.error('未知异常类型', String(exception));
    }

    response.status(status).json({
      success: false,
      data: null,
      error: payload,
      traceId: request.headers['x-trace-id'] as string | undefined,
      timestamp: new Date().toISOString(),
    });
  }
}
