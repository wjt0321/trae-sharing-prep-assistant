#!/usr/bin/env node
/**
 * 安全扫描脚本
 *
 * 用途：扫描代码库中可能存在的密钥泄露、敏感信息硬编码
 * 用法：node scripts/security-scan.mjs
 *
 * 检查项：
 *   1. 硬编码的 API Key / Secret（常见模式）
 *   2. .env 文件是否被 git 跟踪
 *   3. JWT_SECRET 是否仍为默认值
 *   4. 数据库连接串是否包含明文密码
 *   5. 日志中是否打印了敏感字段
 *
 * 退出码：0 = 通过；1 = 发现告警
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..", "..");

const findings = [];
const warn = (file, line, msg) =>
  findings.push({ file, line, msg, severity: "WARN" });
const fail = (file, line, msg) =>
  findings.push({ file, line, msg, severity: "FAIL" });

// --- 1. 常见密钥模式 ---
const SECRET_PATTERNS = [
  { name: "OpenAI API Key", re: /sk-[A-Za-z0-9]{20,}/ },
  { name: "Anthropic API Key", re: /sk-ant-[A-Za-z0-9-]{20,}/ },
  { name: "AWS Access Key", re: /AKIA[0-9A-Z]{16}/ },
  { name: "Generic API Key (long)", re: /api[_-]?key\s*[:=]\s*["'][A-Za-z0-9]{32,}["']/i },
  { name: "Generic Secret (long)", re: /secret\s*[:=]\s*["'][A-Za-z0-9]{32,}["']/i },
];

// --- 2. 跳过的目录/文件 ---
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  ".git",
  ".turbo",
  "backups",
  "docs",
  "legacy-demo",
]);
const SCAN_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".json",
  ".env",
  ".example",
  ".md",
]);

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, acc);
    } else if (SCAN_EXT.has(extname(full)) || entry.startsWith(".env")) {
      acc.push(full);
    }
  }
  return acc;
}

function scanFile(filePath) {
  let content;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return;
  }
  const rel = relative(PROJECT_ROOT, filePath);
  const lines = content.split("\n");

  lines.forEach((line, idx) => {
    // 跳过注释行
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || trimmed.startsWith("//")) return;

    for (const { name, re } of SECRET_PATTERNS) {
      if (re.test(line)) {
        warn(rel, idx + 1, `疑似硬编码密钥：${name}`);
      }
    }

    // JWT_SECRET 默认值检查
    if (/JWT_SECRET\s*[:=]\s*["']?please-change-me["']?/.test(line)) {
      fail(rel, idx + 1, "JWT_SECRET 仍为默认值 please-change-me");
    }

    // 明文密码（仅检查非示例文件）
    if (
      !filePath.endsWith(".example") &&
      !filePath.endsWith(".md") &&
      /password\s*[:=]\s*["'][^"']{6,}["']/i.test(line) &&
      !/bcrypt|hash|placeholder|example|test/i.test(line)
    ) {
      warn(rel, idx + 1, "疑似明文密码赋值");
    }
  });
}

// --- 3. .env 是否被 git 跟踪 ---
function checkEnvTracked() {
  try {
    const out = execSync("git ls-files", { cwd: PROJECT_ROOT, encoding: "utf-8" });
    const tracked = out.split("\n");
    for (const f of tracked) {
      if (f.endsWith(".env") && !f.endsWith(".env.example")) {
        fail(f, 0, ".env 文件被 git 跟踪，存在泄露风险");
      }
    }
  } catch {
    // 非 git 仓库，跳过
  }
}

// --- 4. 日志中是否打印敏感字段 ---
function scanForSensitiveLogs(filePath) {
  let content;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return;
  }
  const rel = relative(PROJECT_ROOT, filePath);
  const lines = content.split("\n");
  const sensitiveKeys = /console\.(log|info|debug|warn|error)\s*\([^)]*\b(apiKey|api_key|password|secret|token|authorization)\b/i;
  lines.forEach((line, idx) => {
    if (sensitiveKeys.test(line) && !/脱敏|mask|redact/i.test(line)) {
      warn(rel, idx + 1, "日志中疑似打印敏感字段");
    }
  });
}

// --- 主流程 ---
console.log("[security-scan] 开始扫描...");
const files = walk(join(PROJECT_ROOT, "apps"));
files.forEach((f) => {
  scanFile(f);
  if (f.endsWith(".ts") || f.endsWith(".tsx")) {
    scanForSensitiveLogs(f);
  }
});
checkEnvTracked();

// --- 输出报告 ---
console.log("\n[security-scan] 扫描结果：");
if (findings.length === 0) {
  console.log("  ✓ 未发现安全问题");
  process.exit(0);
}

const fails = findings.filter((f) => f.severity === "FAIL");
const warns = findings.filter((f) => f.severity === "WARN");
console.log(`  FAIL: ${fails.length}  WARN: ${warns.length}\n`);

for (const f of findings) {
  const tag = f.severity === "FAIL" ? "✗" : "⚠";
  console.log(`  ${tag} [${f.severity}] ${f.file}:${f.line} — ${f.msg}`);
}

process.exit(fails.length > 0 ? 1 : 0);
