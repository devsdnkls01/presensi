import { cookies } from 'next/headers';

export const SESSION_COOKIE_NAME = 'presensi_session';

const AUTH_SECRET = process.env.AUTH_SECRET || process.env.SESSION_SECRET || 'smartsiswa-auth-secret-key-2026';

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  role: 'DEVELOPER' | 'SCHOOL_ADMIN' | 'TEACHER';
  schoolId?: string | null;
  schoolName?: string | null;
}

// Pure TypeScript SHA-256 implementation (Edge Runtime & Node.js 100% compatible)
function sha256Bytes(bytes: Uint8Array): Uint8Array {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const words: number[] = [];
  const byteLen = bytes.length;
  const bitLen = byteLen * 8;
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, number> = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  for (let i = 0; i < byteLen; i++) {
    words[i >> 2] |= bytes[i] << (((3 - i) % 4) * 8);
  }
  words[byteLen >> 2] |= 0x80 << (((3 - byteLen) % 4) * 8);

  const padLen = (((byteLen + 8) >> 6) + 1) << 4;
  for (let i = words.length; i < padLen; i++) words[i] = 0;
  words[padLen - 2] = (bitLen / maxWord) | 0;
  words[padLen - 1] = bitLen | 0;

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  for (let j = 0; j < padLen; j += 16) {
    const w = words.slice(j, j + 16);
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let i = 0; i < 64; i++) {
      if (i >= 16) {
        const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + k[i] + w[i]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }

  const result = new Uint8Array(32);
  const hs = [h0, h1, h2, h3, h4, h5, h6, h7];
  for (let i = 0; i < 8; i++) {
    result[i * 4] = (hs[i] >>> 24) & 0xff;
    result[i * 4 + 1] = (hs[i] >>> 16) & 0xff;
    result[i * 4 + 2] = (hs[i] >>> 8) & 0xff;
    result[i * 4 + 3] = hs[i] & 0xff;
  }
  return result;
}

// Pure HMAC-SHA256
function hmacSha256Hex(keyStr: string, msgStr: string): string {
  const enc = new TextEncoder();
  const rawKey = enc.encode(keyStr);
  const msg = enc.encode(msgStr);
  const key: Uint8Array = rawKey.length > 64 ? sha256Bytes(rawKey) : rawKey;

  const kPad = new Uint8Array(64);
  kPad.set(key);


  const ipad = new Uint8Array(64);
  const opad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    ipad[i] = kPad[i] ^ 0x36;
    opad[i] = kPad[i] ^ 0x5c;
  }

  const inner = new Uint8Array(64 + msg.length);
  inner.set(ipad);
  inner.set(msg, 64);
  const innerHash = sha256Bytes(inner);

  const outer = new Uint8Array(64 + 32);
  outer.set(opad);
  outer.set(innerHash, 64);
  const outerHash = sha256Bytes(outer);

  return Array.from(outerHash)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Constant-time string comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Universal Base64URL encoder/decoder
function toBase64Url(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64url');
  }
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(b64: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b64, 'base64url').toString('utf-8');
  }
  let str = b64.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function createSessionToken(user: SessionUser): string {
  const payload = JSON.stringify({
    ...user,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  const payloadB64 = toBase64Url(payload);
  const signature = hmacSha256Hex(AUTH_SECRET, payloadB64);
  return `${payloadB64}.${signature}`;
}

export function parseSessionToken(token: string): SessionUser | null {
  try {
    if (!token || typeof token !== 'string' || !token.includes('.')) {
      return null;
    }

    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) {
      return null;
    }

    const expectedSignature = hmacSha256Hex(AUTH_SECRET, payloadB64);

    if (!timingSafeEqual(signature, expectedSignature)) {
      return null;
    }

    const payloadStr = fromBase64Url(payloadB64);
    const data = JSON.parse(payloadStr);

    if (data.exp && Date.now() > data.exp) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      username: data.username,
      role: data.role,
      schoolId: data.schoolId,
      schoolName: data.schoolName,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) return null;
  return parseSessionToken(sessionCookie.value);
}
