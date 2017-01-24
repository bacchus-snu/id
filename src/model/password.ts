/**
 * Check for password
 */
export async function check(stored: Buffer, input: string): Promise<boolean> {
  throw new Error('Not implemented');
}

/**
 * Encrypt
 */
export async function encrypt(input: string, iterations: number): Promise<Buffer> {
  throw new Error('Not implemented');
}

/**
 * Generate secure randomString for resetToken, etc.
 */
export async function random(): Promise<string> {
  throw new Error('Not implemented');
}
