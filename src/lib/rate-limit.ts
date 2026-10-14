const buckets = new Map<string, { count: number; reset: number }>();

/** Prosty limiter w pamięci procesu – wystarczy na pojedynczą instancję. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
    }
    return true;
  }
  bucket.count++;
  return bucket.count <= limit;
}

/**
 * IP klienta. Na Vercelu tylko x-real-ip / x-forwarded-for (ustawia je Vercel – nie da się ich podrobić);
 * cf-connecting-ip bierzemy tylko poza Vercelem (serwer za Cloudflare).
 */
export function clientIp(headers: Headers): string {
  const vercel = !!process.env.VERCEL;
  return (
    (vercel ? null : headers.get("cf-connecting-ip")) ??
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/** Limit wspólny dla wszystkich instancji (licznik w bazie); gdy baza nie odpowiada – limit w pamięci. */
export async function rateLimitShared(key: string, limit: number, windowMs: number): Promise<boolean> {
  try {
    const { getStore } = await import("@/lib/store");
    return (await getStore().hit(key, Math.ceil(windowMs / 1000))) <= limit;
  } catch {
    return rateLimit(key, limit, windowMs);
  }
}
