import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

/**
 * AES-256-GCM 加密工具
 *
 * 用于加密 AI 网关的 API Key，确保：
 * - 落库时为密文（隐式存储，不落明文配置文件）
 * - 读取时只返回掩码（不主动泄露）
 * - 仅在实际调用 AI 时解密
 *
 * 密文格式：iv:authTag:ciphertext（均为 hex 编码）
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM 推荐 12 字节 IV

/**
 * 从环境变量派生 32 字节密钥
 * 优先使用 AI_CONFIG_ENCRYPTION_KEY，回退到 JWT_SECRET
 */
export function deriveEncryptionKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

/**
 * 加密明文
 * @returns 格式 iv:authTag:ciphertext
 */
export function encrypt(plaintext: string, secret: string): string {
  const key = deriveEncryptionKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

/**
 * 解密密文
 * @param encrypted 格式 iv:authTag:ciphertext
 */
export function decrypt(encrypted: string, secret: string): string {
  const key = deriveEncryptionKey(secret);
  const [ivHex, authTagHex, ciphertextHex] = encrypted.split(':');
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error('密文格式无效');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * 生成 API Key 掩码（仅保留末尾 4 位）
 * @example maskApiKey('sk-abcdef1234') => 'sk-****1234'
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 4) {
    return '****';
  }
  const prefix = apiKey.slice(0, apiKey.length <= 8 ? 3 : Math.min(apiKey.length - 4, 8));
  const suffix = apiKey.slice(-4);
  return `${prefix}****${suffix}`;
}

/**
 * 提取 API Key 末尾 4 位作为提示（用于前端展示）
 */
export function extractKeyHint(apiKey: string): string {
  if (apiKey.length <= 4) {
    return apiKey;
  }
  return apiKey.slice(-4);
}
