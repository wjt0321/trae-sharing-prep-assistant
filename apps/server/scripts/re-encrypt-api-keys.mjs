#!/usr/bin/env node
/**
 * AI 配置加密密钥轮换脚本
 *
 * 用途：当 AI_CONFIG_ENCRYPTION_KEY 变更后，用旧密钥解密已存储的 API Key，
 *       再用新密钥重新加密，完成密钥轮换。
 *
 * 用法：
 *   node scripts/re-encrypt-api-keys.mjs <oldKey> [newKey]
 *
 * 参数：
 *   oldKey  旧加密密钥（轮换前使用的 AI_CONFIG_ENCRYPTION_KEY 或 JWT_SECRET）
 *   newKey  新加密密钥（默认读取 .env 中的 AI_CONFIG_ENCRYPTION_KEY）
 *
 * 环境变量：
 *   DATABASE_URL  数据库连接字符串（默认从 .env 读取）
 *
 * 退出码：0 = 成功；1 = 失败
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 简易 .env 读取（避免 dotenv 依赖）
function loadEnv() {
  const envPath = resolve(__dirname, "..", ".env");
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env 不存在时忽略
  }
}

loadEnv();

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function deriveKey(secret) {
  return createHash("sha256").update(secret).digest();
}

function encrypt(plaintext, secret) {
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

function decrypt(encrypted, secret) {
  const key = deriveKey(secret);
  const [ivHex, authTagHex, ciphertextHex] = encrypted.split(":");
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error("密文格式无效");
  }
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

async function main() {
  const oldKey = process.argv[2];
  const newKey = process.argv[3] || process.env.AI_CONFIG_ENCRYPTION_KEY;

  if (!oldKey) {
    console.error("用法: node scripts/re-encrypt-api-keys.mjs <oldKey> [newKey]");
    console.error("  oldKey  轮换前的加密密钥（AI_CONFIG_ENCRYPTION_KEY 或 JWT_SECRET）");
    console.error("  newKey  新密钥（默认读取 .env 中的 AI_CONFIG_ENCRYPTION_KEY）");
    process.exit(1);
  }

  if (!newKey) {
    console.error("错误：未提供新密钥，且 .env 中未配置 AI_CONFIG_ENCRYPTION_KEY");
    process.exit(1);
  }

  if (oldKey === newKey) {
    console.error("错误：新旧密钥相同，无需轮换");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const configs = await prisma.aiProviderConfig.findMany();
    console.log(`找到 ${configs.length} 条 AI 配置记录`);

    let success = 0;
    let failed = 0;

    for (const config of configs) {
      try {
        const plaintext = decrypt(config.apiKeyEnc, oldKey);
        const newEncrypted = encrypt(plaintext, newKey);
        await prisma.aiProviderConfig.update({
          where: { id: config.id },
          data: { apiKeyEnc: newEncrypted },
        });
        console.log(`  [OK] ${config.id} (${config.provider}/${config.modelName}) 已重新加密`);
        success++;
      } catch (err) {
        console.error(`  [FAIL] ${config.id} (${config.provider}/${config.modelName}): ${err.message}`);
        failed++;
      }
    }

    console.log(`\n轮换完成：成功 ${success} 条，失败 ${failed} 条`);
    if (failed > 0) {
      console.error("失败的记录可能使用了不同的旧密钥，请检查后手动处理或重新配置 API Key");
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("密钥轮换失败:", err.message);
  process.exit(1);
});
