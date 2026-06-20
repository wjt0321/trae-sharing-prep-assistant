import { Module, Global } from '@nestjs/common';
import { TaskWorkerService } from './task-worker.service';

/**
 * 任务调度模块
 * 全局可用，应用启动时自动开始轮询
 */
@Global()
@Module({
  providers: [TaskWorkerService],
  exports: [TaskWorkerService],
})
export class TaskWorkerModule {}
