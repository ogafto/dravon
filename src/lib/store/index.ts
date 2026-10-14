import "server-only";
import { FileStore } from "./file";
import { RedisStore } from "./redis";
import type { Store } from "./types";

export type { Delivery, DeliveryAck, DeliveryInfo, DeliveryKind, DeliveryState, Order, OrderLine, OrderStatus, RecentPurchase, SavedCatalog, ShopSettings, Store } from "./types";

const globalForStore = globalThis as unknown as { __dravonStoreV3?: Store };

export function getStore(): Store {
  if (!globalForStore.__dravonStoreV3) {
    const env = process.env;
    // Upstash podpięty ręcznie (UPSTASH_*) albo przez integrację Vercel Marketplace (KV_REST_API_*)
    const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
    const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
    if (!(url && token) && env.VERCEL) {
      // Vercel nie ma trwałego dysku – zamówienia z pliku by znikały
      throw new Error("Brak bazy: podłącz Upstash Redis w Vercel (Storage → Upstash) i wdróż ponownie.");
    }
    globalForStore.__dravonStoreV3 = url && token ? new RedisStore(url, token) : new FileStore(env.DATA_DIR || "./data");
  }
  return globalForStore.__dravonStoreV3;
}
