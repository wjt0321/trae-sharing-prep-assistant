import { Module, Global, OnModuleInit } from '@nestjs/common';
import { StorageService } from './storage.service';

/**
 * 文件存储模块
 * 全局可用
 */
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule implements OnModuleInit {
  constructor(private readonly storage: StorageService) {}

  async onModuleInit(): Promise<void> {
    await this.storage.ensureDir();
  }
}
