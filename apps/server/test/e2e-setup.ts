/**
 * E2E 测试环境设置
 * 在测试文件加载前设置环境变量，确保 PrismaClient 连接到测试数据库
 */

// 使用独立的测试数据库文件，避免污染开发数据库
process.env.DATABASE_URL = 'file:./test.e2e.db';

// JWT 密钥（仅用于测试）
process.env.JWT_SECRET = 'e2e-test-secret-not-for-production';
process.env.JWT_EXPIRES_IN = '1d';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

// AI 网关使用 mock 模式
process.env.AI_GATEWAY_PROVIDER = 'mock';
process.env.AI_CONFIG_ENCRYPTION_KEY = '';

// TaskWorker：设置超长间隔，防止测试期间触发轮询
process.env.TASK_WORKER_INTERVAL_MS = '3600000';
process.env.SESSION_CLEANUP_INTERVAL_MS = '3600000';

// bcrypt：降低 salt rounds 加速测试
process.env.BCRYPT_SALT_ROUNDS = '4';

// 速率限制：设置高阈值，避免测试触发限流
process.env.RATE_LIMIT_PER_MINUTE = '1000';
process.env.RATE_LIMIT_AUTH_PER_MINUTE = '1000';
process.env.RATE_LIMIT_WINDOW_MS = '60000';

// 监控：禁用统计刷写
process.env.MONITORING_STATS_FLUSH_MS = '3600000';
