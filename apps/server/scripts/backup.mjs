#!/usr/bin/env node
/**
 * 数据备份脚本
 *
 * 用途：将 SQLite 数据库 + uploads 目录打包备份
 * 用法：node scripts/backup.mjs [output-dir]
 *
 * 默认输出到 apps/server/backups/backup-YYYYMMDD-HHmmss.zip
 *
 * 备份内容：
 *   - prisma/dev.db（SQLite 数据库）
 *   - uploads/（用户上传文件）
 *   - prisma/schema.prisma（当前 schema 快照）
 *
 * 恢复方式：
 *   1. 解压备份文件
 *   2. 停止后端服务
 *   3. 用解压出的 dev.db 覆盖 prisma/dev.db
 *   4. 用解压出的 uploads 目录覆盖 uploads/
 *   5. 重启后端服务
 */

import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SERVER_ROOT = resolve(__dirname, "..");

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "-" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function copyDir(src, dest) {
  if (!existsSync(src)) return;
  ensureDir(dest);
  for (const entry of readdirSync(src)) {
    const s = join(src, entry);
    const d = join(dest, entry);
    if (statSync(s).isDirectory()) {
      copyDir(s, d);
    } else {
      copyFileSync(s, d);
    }
  }
}

function main() {
  const outputDir = process.argv[2]
    ? resolve(process.argv[2])
    : join(SERVER_ROOT, "backups");
  ensureDir(outputDir);

  const ts = timestamp();
  const backupName = `backup-${ts}`;
  const stagingDir = join(outputDir, backupName);
  ensureDir(stagingDir);

  console.log(`[backup] 开始备份到 ${stagingDir}`);

  // 1. 数据库
  const dbPath = join(SERVER_ROOT, "prisma", "dev.db");
  if (existsSync(dbPath)) {
    copyFileSync(dbPath, join(stagingDir, "dev.db"));
    console.log("[backup] ✓ SQLite 数据库已复制");
  } else {
    console.warn("[backup] ⚠ 未找到 dev.db，跳过数据库备份");
  }

  // 2. uploads
  const uploadsDir = join(SERVER_ROOT, "uploads");
  if (existsSync(uploadsDir)) {
    copyDir(uploadsDir, join(stagingDir, "uploads"));
    console.log("[backup] ✓ uploads 目录已复制");
  } else {
    console.warn("[backup] ⚠ 未找到 uploads 目录，跳过");
  }

  // 3. schema 快照
  const schemaPath = join(SERVER_ROOT, "prisma", "schema.prisma");
  if (existsSync(schemaPath)) {
    copyFileSync(schemaPath, join(stagingDir, "schema.prisma"));
    console.log("[backup] ✓ schema.prisma 已复制");
  }

  // 4. 打包为 zip（如果系统有 tar/zip 命令）
  const zipPath = join(outputDir, `${backupName}.zip`);
  let zipped = false;
  try {
    const r = spawnSync("powershell", [
      "-NoProfile",
      "-Command",
      `Compress-Archive -Path "${stagingDir}/*" -DestinationPath "${zipPath}" -Force`,
    ]);
    if (r.status === 0 && existsSync(zipPath)) {
      zipped = true;
      console.log(`[backup] ✓ 已打包为 ${zipPath}`);
    }
  } catch {
    // ignore
  }

  if (!zipped) {
    console.log(`[backup] ℹ 未生成 zip，原始文件保留在 ${stagingDir}`);
  }

  console.log(`[backup] 完成。时间戳：${ts}`);
}

main();
