import { encrypt, decrypt, maskApiKey, extractKeyHint, reEncrypt } from './crypto.util';

describe('crypto.util — AES-256-GCM 加密工具', () => {
  const SECRET = 'test-encryption-secret-key-32b!';

  describe('encrypt() / decrypt() 往返', () => {
    it('加密后解密能还原原始明文', () => {
      const plaintext = 'sk-abcdef1234567890';
      const encrypted = encrypt(plaintext, SECRET);
      const decrypted = decrypt(encrypted, SECRET);
      expect(decrypted).toBe(plaintext);
    });

    it('加密结果不等于明文', () => {
      const plaintext = 'sk-secret-api-key';
      const encrypted = encrypt(plaintext, SECRET);
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).not.toContain(plaintext);
    });

    it('密文格式为 iv:authTag:ciphertext（三段 hex）', () => {
      const encrypted = encrypt('test', SECRET);
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
      // 每段都是 hex 字符串
      for (const part of parts) {
        expect(part).toMatch(/^[0-9a-f]+$/);
      }
    });

    it('每次加密生成不同密文（IV 随机）', () => {
      const plaintext = 'same-plaintext';
      const encrypted1 = encrypt(plaintext, SECRET);
      const encrypted2 = encrypt(plaintext, SECRET);
      expect(encrypted1).not.toBe(encrypted2);
      // 但都能解密为同一明文
      expect(decrypt(encrypted1, SECRET)).toBe(plaintext);
      expect(decrypt(encrypted2, SECRET)).toBe(plaintext);
    });

    it('支持中文明文', () => {
      const plaintext = '这是一段中文 API 密钥';
      const encrypted = encrypt(plaintext, SECRET);
      const decrypted = decrypt(encrypted, SECRET);
      expect(decrypted).toBe(plaintext);
    });

    it('支持长字符串', () => {
      const plaintext = 'x'.repeat(10000);
      const encrypted = encrypt(plaintext, SECRET);
      const decrypted = decrypt(encrypted, SECRET);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('decrypt() 错误处理', () => {
    it('错误密钥解密失败', () => {
      const encrypted = encrypt('secret', SECRET);
      expect(() => decrypt(encrypted, 'wrong-secret')).toThrow();
    });

    it('密文格式无效时抛错', () => {
      expect(() => decrypt('invalid-format', SECRET)).toThrow('密文格式无效');
      expect(() => decrypt('only:two-parts', SECRET)).toThrow('密文格式无效');
      expect(() => decrypt('', SECRET)).toThrow('密文格式无效');
    });

    it('篡改密文后解密失败', () => {
      const encrypted = encrypt('secret', SECRET);
      const parts = encrypted.split(':');
      // 篡改 ciphertext 部分
      const tampered = `${parts[0]}:${parts[1]}:000000`;
      expect(() => decrypt(tampered, SECRET)).toThrow();
    });

    it('篡改 authTag 后解密失败', () => {
      const encrypted = encrypt('secret', SECRET);
      const parts = encrypted.split(':');
      // 篡改 authTag 部分
      const tampered = `${parts[0]}:00000000:${parts[2]}`;
      expect(() => decrypt(tampered, SECRET)).toThrow();
    });
  });

  describe('maskApiKey()', () => {
    it('长密钥保留前缀（最多8位）和后4位', () => {
      expect(maskApiKey('sk-abcdef1234567890')).toBe('sk-abcde****7890');
    });

    it('8 字符密钥保留前3位和后4位', () => {
      expect(maskApiKey('12345678')).toBe('123****5678');
    });

    it('5-7 字符密钥保留前3位和后4位', () => {
      expect(maskApiKey('12345')).toBe('123****2345');
    });

    it('4 字符及以下密钥全部掩码', () => {
      expect(maskApiKey('1234')).toBe('****');
      expect(maskApiKey('abc')).toBe('****');
      expect(maskApiKey('')).toBe('****');
    });
  });

  describe('extractKeyHint()', () => {
    it('提取末尾4位', () => {
      expect(extractKeyHint('sk-abcdef1234567890')).toBe('7890');
    });

    it('4 字符及以下返回原字符串', () => {
      expect(extractKeyHint('1234')).toBe('1234');
      expect(extractKeyHint('abc')).toBe('abc');
      expect(extractKeyHint('')).toBe('');
    });
  });

  describe('reEncrypt() 密钥轮换', () => {
    it('用旧密钥解密后用新密钥重新加密', () => {
      const oldSecret = 'old-secret-key';
      const newSecret = 'new-secret-key';
      const plaintext = 'sk-api-key-to-rotate';

      const oldEncrypted = encrypt(plaintext, oldSecret);
      const newEncrypted = reEncrypt(oldEncrypted, oldSecret, newSecret);

      // 新密文能用新密钥解密
      expect(decrypt(newEncrypted, newSecret)).toBe(plaintext);
      // 新密文不能用旧密钥解密
      expect(() => decrypt(newEncrypted, oldSecret)).toThrow();
      // 新密文与旧密文不同
      expect(newEncrypted).not.toBe(oldEncrypted);
    });

    it('错误旧密钥轮换失败', () => {
      const oldSecret = 'old-secret';
      const wrongSecret = 'wrong-secret';
      const newSecret = 'new-secret';
      const plaintext = 'test';

      const oldEncrypted = encrypt(plaintext, oldSecret);
      expect(() => reEncrypt(oldEncrypted, wrongSecret, newSecret)).toThrow();
    });
  });
});
