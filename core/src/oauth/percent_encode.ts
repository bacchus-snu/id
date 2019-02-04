/**
 * Percent-encode the given string as per Section 5.1.
 * @param str the string to encode
 * @returns percent-encoded string
 */
export default function percentEncode(str: string): string {
  const buf = Buffer.from(str, 'utf8')
  const ret = []
  for (const b of buf.values()) {
    if (
      (b >= 0x41 && b <= 0x5a) || // A-Z
      (b >= 0x61 && b <= 0x7a) || // a-z
      (b >= 0x30 && b <= 0x39) || // 0-9
      b === 0x2d || b === 0x2e || // '-', '.'
      b === 0x5f || b === 0x7e    // '_', '~'
    ) {
      ret.push(String.fromCharCode(b))
    } else {
      ret.push(`%${b.toString(16).toUpperCase().padStart(2, '0')}`)
    }
  }
  return ret.join('')
}
