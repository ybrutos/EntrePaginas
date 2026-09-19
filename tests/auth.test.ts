import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, generateSecureToken } from '../src/lib/auth';

describe('Authentication & Security', () => {
  it('hashes passwords securely and verifies correctly', async () => {
    const rawPassword = 'MinhaSenhaSegura!@#123';
    const hash = await hashPassword(rawPassword);

    // Hash should not be equal to raw password
    expect(hash).not.toBe(rawPassword);
    expect(hash.startsWith('$2')).toBe(true);

    // Verification should pass with correct password
    const isValid = await verifyPassword(rawPassword, hash);
    expect(isValid).toBe(true);

    // Verification should fail with incorrect password
    const isInvalid = await verifyPassword('SenhaErrada', hash);
    expect(isInvalid).toBe(false);
  });

  it('generates unique cryptographic session tokens', () => {
    const token1 = generateSecureToken();
    const token2 = generateSecureToken();

    expect(token1).toBeDefined();
    expect(token2).toBeDefined();
    expect(token1).not.toBe(token2);
    expect(token1.length).toBeGreaterThanOrEqual(32);
  });
});
