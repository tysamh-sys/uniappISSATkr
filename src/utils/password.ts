import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function hashPassword(password: string, rounds = 10): Promise<string> {
  const salt = await bcrypt.genSalt(rounds);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generates a high-entropy, cryptographically secure temporary password for imported users.
 * Combines uppercase, lowercase, numbers, and symbols (e.g. "Km8$xP2#vL9@").
 * Prevents insecure shared credentials like 'issatk2026'.
 */
export function generateSecureTemporaryPassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*';
  const allChars = upper + lower + digits + symbols;

  const bytes = crypto.randomBytes(length);
  const chars = [
    upper[bytes[0] % upper.length],
    lower[bytes[1] % lower.length],
    digits[bytes[2] % digits.length],
    symbols[bytes[3] % symbols.length],
  ];

  for (let i = 4; i < length; i++) {
    chars.push(allChars[bytes[i] % allChars.length]);
  }

  // Shuffle array using Fisher-Yates
  for (let i = chars.length - 1; i > 0; i--) {
    const j = bytes[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}
