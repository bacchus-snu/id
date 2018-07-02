import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
/**
 * Check for password
 */
export async function check(stored: string, input: string): Promise<boolean> {
  return bcrypt.compare(stored, input);
}

/**
 * Encrypt
 */
export async function encrypt(input: string, iterations: number): Promise<string> {
  return bcrypt.hash(input, 10);
}

/**
 * Generate secure randomString for resetToken, etc.
 */
export async function random(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    // this will generate 40 length of string
    crypto.randomBytes(20, (err, buffer) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(buffer.toString('hex'));
    })
  });
}
