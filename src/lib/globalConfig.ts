import { get } from '@vercel/global-config';

/**
 * Safely retrieve values from Vercel Global Config (Edge Key-Value Store)
 * with graceful fallback if not yet connected in the current environment.
 */
export async function getGlobalConfig<T = any>(key: string, defaultValue?: T): Promise<T | null> {
  try {
    const val = await get(key);
    return val !== undefined && val !== null ? (val as T) : (defaultValue ?? null);
  } catch (err) {
    // Graceful fallback when running locally or before store is connected
    return defaultValue ?? null;
  }
}
