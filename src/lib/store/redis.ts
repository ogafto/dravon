import { rank } from "./file";
import type { Delivery, DeliveryAck, DeliveryInfo, Order, RecentPurchase, SavedCatalog, ShopSettings, Store } from "./types";

const ORDER_TTL = 60 * 60 * 24 * 90; // 90 dni

/** Magazyn na Upstash Redis (REST) – dla Vercela i innych platform bez trwałego dysku. */
export class RedisStore implements Store {
  constructor(
    private url: string,
    private token: string,
    private prefix = "dravon",
  ) {}

  private async exec(commands: (string | number)[][], transaction = false): Promise<unknown[]> {
    const res = await fetch(`${this.url.replace(/\/$/, "")}/${transaction ? "multi-exec" : "pipeline"}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands.map((c) => c.map(String))),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Upstash ${res.status}: ${await res.text()}`);
    const out = (await res.json()) as { result?: unknown; error?: string }[];
    const failed = out.find((r) => r.error);
    if (failed) throw new Error(`Upstash: ${failed.error}`);
    return out.map((r) => r.result);
  }

  private orderKey = (id: string) => `${this.prefix}:order:${id}`;
  /** Oczekujące dostawy trybu: hash id → JSON (usuwane dopiero po potwierdzeniu pluginu). */
  private pendingKey = (mode: string) => `${this.prefix}:pending:${mode}`;
  /** Stany dostaw zamówienia: hash id dostawy → stan (osobno, żeby potwierdzenia nie nadpisywały zamówienia). */
  private stateKey = (orderId: string) => `${this.prefix}:dstate:${orderId}`;

  async saveOrder(order: Order) {
    await this.exec([
      ["SET", this.orderKey(order.id), JSON.stringify(order), "EX", ORDER_TTL],
      // indeks do listy zamówień w panelu
      ["ZADD", `${this.prefix}:orders`, order.createdAt, order.id],
    ]);
  }

  async getOrder(id: string) {
    const [raw] = await this.exec([["GET", this.orderKey(id)]]);
    return typeof raw === "string" ? (JSON.parse(raw) as Order) : null;
  }

  async updateOrder(id: string, patch: Partial<Order>) {
    const order = await this.getOrder(id);
    if (order) await this.saveOrder({ ...order, ...patch });
  }

  async fulfillOrder(id: string, patch: Partial<Order>, deliveries: Delivery[]) {
    const order = await this.getOrder(id);
    if (!order || order.status === "paid") return false;
    // Blokada idempotencji – tylko pierwszy IPN dla zamówienia przejdzie dalej.
    const [lock] = await this.exec([["SET", `${this.prefix}:fulfilled:${id}`, "1", "NX", "EX", ORDER_TTL]]);
    if (lock !== "OK") return false;

    const commands: (string | number)[][] = [
      ["SET", this.orderKey(id), JSON.stringify({ ...order, ...patch, status: "paid" }), "EX", ORDER_TTL],
    ];
    const recent: RecentPurchase = { nick: order.nick, item: order.lines[0]?.name ?? "", at: Date.now() };
    commands.push(["LPUSH", `${this.prefix}:recent`, JSON.stringify(recent)], ["LTRIM", `${this.prefix}:recent`, 0, 49]);
    for (const d of deliveries) {
      commands.push(["HSET", this.pendingKey(order.mode), d.id, JSON.stringify(d)], ["HSET", this.stateKey(id), d.id, "queued"]);
    }
    if (deliveries.length) commands.push(["EXPIRE", this.stateKey(id), ORDER_TTL]);
    await this.exec(commands, true);
    return true;
  }

  async drainDeliveries(modes: string[]) {
    const result: Delivery[] = [];
    for (const mode of modes) {
      const key = this.pendingKey(mode);
      const [items] = await this.exec([["HVALS", key], ["DEL", key]], true);
      for (const raw of (items as string[]) ?? []) result.push(JSON.parse(raw) as Delivery);
    }
    return result.sort((a, b) => a.time - b.time);
  }

  async pendingDeliveries(mode: string, limit: number) {
    const [items] = await this.exec([["HVALS", this.pendingKey(mode)]]);
    return ((items as string[]) ?? [])
      .map((raw) => JSON.parse(raw) as Delivery)
      .sort((a, b) => a.time - b.time)
      .slice(0, limit);
  }

  async ackDeliveries(mode: string, acks: DeliveryAck[]) {
    if (!acks.length) return 0;
    // obecne stany – żeby nie cofnąć „claimed” do „received” przy ponowionym potwierdzeniu
    const current = await this.exec(acks.map((a) => ["HGET", this.stateKey(a.order_id), a.id]));
    const commands: (string | number)[][] = [];
    let accepted = 0;
    acks.forEach((a, i) => {
      commands.push(["HDEL", this.pendingKey(mode), a.id]);
      const was = (current[i] as DeliveryInfo["state"] | null) ?? null;
      if (was && rank(a.state) > rank(was)) {
        commands.push(["HSET", this.stateKey(a.order_id), a.id, a.state], ["EXPIRE", this.stateKey(a.order_id), ORDER_TTL]);
      }
      if (was) accepted++;
    });
    await this.exec(commands, true);
    return accepted;
  }

  async deliveryStates(order: Order): Promise<DeliveryInfo[]> {
    const list = order.deliveries ?? [];
    if (!list.length) return list;
    const [raw] = await this.exec([["HGETALL", this.stateKey(order.id)]]);
    const flat = (raw as string[]) ?? [];
    const states = new Map<string, string>();
    for (let i = 0; i + 1 < flat.length; i += 2) states.set(flat[i], flat[i + 1]);
    return list.map((d) => ({ ...d, state: (states.get(d.id) as DeliveryInfo["state"]) ?? d.state }));
  }

  async listOrders(limit: number) {
    const [ids] = await this.exec([["ZRANGE", `${this.prefix}:orders`, 0, limit - 1, "REV"]]);
    const list = (ids as string[]) ?? [];
    if (!list.length) return [];
    const [raws] = await this.exec([["MGET", ...list.map(this.orderKey)]]);
    return ((raws as (string | null)[]) ?? []).filter((r): r is string => !!r).map((r) => JSON.parse(r) as Order);
  }

  async getCatalog() {
    const [raw] = await this.exec([["GET", `${this.prefix}:catalog`]]);
    return typeof raw === "string" ? (JSON.parse(raw) as SavedCatalog) : null;
  }

  async saveCatalog(catalog: SavedCatalog) {
    await this.exec([["SET", `${this.prefix}:catalog`, JSON.stringify(catalog)]]);
  }

  async getSettings() {
    const [raw] = await this.exec([["GET", `${this.prefix}:settings`]]);
    return typeof raw === "string" ? (JSON.parse(raw) as ShopSettings) : null;
  }

  async saveSettings(settings: ShopSettings) {
    await this.exec([["SET", `${this.prefix}:settings`, JSON.stringify(settings)]]);
  }

  async getMeta(key: string) {
    const [raw] = await this.exec([["GET", `${this.prefix}:meta:${key}`]]);
    return typeof raw === "string" ? raw : null;
  }

  async setMeta(key: string, value: string) {
    await this.exec([["SET", `${this.prefix}:meta:${key}`, value]]);
  }

  async hit(key: string, windowSec: number) {
    const k = `${this.prefix}:hit:${key}`;
    const [count] = await this.exec([["INCR", k], ["EXPIRE", k, windowSec, "NX"]], true);
    return Number(count) || 0;
  }

  async saveImage(id: string, dataUrl: string) {
    await this.exec([["SET", `${this.prefix}:image:${id}`, dataUrl]]);
  }

  async getImage(id: string) {
    const [raw] = await this.exec([["GET", `${this.prefix}:image:${id}`]]);
    return typeof raw === "string" ? raw : null;
  }

  async listRecent(limit: number) {
    const [items] = await this.exec([["LRANGE", `${this.prefix}:recent`, 0, limit - 1]]);
    return ((items as string[]) ?? []).map((raw) => JSON.parse(raw) as RecentPurchase);
  }
}
