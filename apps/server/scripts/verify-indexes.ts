/**
 * 索引验证脚本：使用 EXPLAIN QUERY PLAN 确认新索引被查询使用
 * 用法：npx ts-node scripts/verify-indexes.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const queries: Array<{ label: string; sql: string }> = [
  {
    label: 'Goal.deletedAt 索引',
    sql: "EXPLAIN QUERY PLAN SELECT * FROM Goal WHERE deletedAt IS NULL",
  },
  {
    label: 'ExecutionTask(goalId, status) 复合索引',
    sql: "EXPLAIN QUERY PLAN SELECT * FROM ExecutionTask WHERE goalId = 'test' AND status = 'pending' AND deletedAt IS NULL",
  },
  {
    label: 'ActivityEvent(goalId, createdAt) 复合索引',
    sql: "EXPLAIN QUERY PLAN SELECT * FROM ActivityEvent WHERE goalId = 'test' AND deletedAt IS NULL ORDER BY createdAt DESC",
  },
  {
    label: 'Comment(goalId, parentId) 复合索引',
    sql: "EXPLAIN QUERY PLAN SELECT * FROM Comment WHERE goalId = 'test' AND parentId IS NULL AND deletedAt IS NULL",
  },
  {
    label: 'TaskJob.createdAt 索引',
    sql: "EXPLAIN QUERY PLAN SELECT * FROM TaskJob WHERE createdAt < datetime('now') ORDER BY createdAt DESC",
  },
  {
    label: 'AiCallLog.createdAt 索引',
    sql: "EXPLAIN QUERY PLAN SELECT * FROM AiCallLog WHERE createdAt < datetime('now') ORDER BY createdAt DESC",
  },
];

async function main() {
  console.log('=== 索引验证（EXPLAIN QUERY PLAN）===\n');
  for (const { label, sql } of queries) {
    console.log(`--- ${label} ---`);
    console.log(`SQL: ${sql}`);
    try {
      const rows = await prisma.$queryRawUnsafe<{ id: number; detail: string }[]>(sql);
      for (const row of rows) {
        console.log(`  ${row.detail}`);
      }
      const usesIndex = rows.some((r) => r.detail.includes('INDEX') || r.detail.includes('COVERING'));
      console.log(`  结果: ${usesIndex ? '✅ 使用索引' : '⚠️ 全表扫描'}`);
    } catch (err) {
      console.log(`  ❌ 错误: ${(err as Error).message}`);
    }
    console.log('');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
