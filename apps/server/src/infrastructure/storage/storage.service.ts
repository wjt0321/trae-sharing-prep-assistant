import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 本地文件存储服务
 * 参考：11_后端平台数据层与AI基础设施实施清单.md
 *
 * 当前阶段：本地 uploads/ 目录
 * 后续升级：对象存储
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir: string;

  constructor(configService: ConfigService) {
    this.uploadDir = path.resolve(
      configService.get<string>('UPLOAD_DIR', './uploads'),
    );
  }

  /**
   * 确保上传目录存在（应用启动时调用）
   */
  async ensureDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`上传目录已就绪: ${this.uploadDir}`);
    } catch (error) {
      this.logger.error(`创建上传目录失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 保存文件
   */
  async save(filename: string, content: string | Buffer): Promise<string> {
    await this.ensureDir();
    const filePath = path.join(this.uploadDir, filename);
    await fs.writeFile(filePath, content);
    return filePath;
  }

  /**
   * 读取文件
   */
  async read(filename: string): Promise<Buffer> {
    const filePath = path.join(this.uploadDir, filename);
    return fs.readFile(filePath);
  }

  /**
   * 读取文件文本
   */
  async readText(filename: string): Promise<string> {
    const filePath = path.join(this.uploadDir, filename);
    return fs.readFile(filePath, 'utf-8');
  }

  /**
   * 删除文件
   */
  async remove(filename: string): Promise<void> {
    const filePath = path.join(this.uploadDir, filename);
    await fs.unlink(filePath);
  }

  /**
   * 检查文件是否存在
   */
  async exists(filename: string): Promise<boolean> {
    const filePath = path.join(this.uploadDir, filename);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取文件完整路径
   */
  resolvePath(filename: string): string {
    return path.join(this.uploadDir, filename);
  }
}
