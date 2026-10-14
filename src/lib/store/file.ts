import { promises as fs } from "node:fs";
import path from "node:path";
import type { Delivery, DeliveryAck, DeliveryInfo, Order, RecentPurchase, SavedCatalog, ShopSettings, Store } from "./types";

type Data = { orders: Record<string, Order>; queue: Delivery[]; catalog?: SavedCatalog; settings?: ShopSettings };

/**
 * Magazyn w pliku JSON – dla hostingu z trwałym dyskiem (VPS, `next start`).
 * Wszystkie operacje idą przez kolejkę, a zapis jest atomowy (plik tymczasowy + rename),
 * więc równoległe IPN i odczyt pluginu nie gubią zamówień.
 */
export class FileStore implements Store {
  private file: string;
  private chain: Promise<unknown> = Promise.resolve();

  constructor(dir: string) {
    this.file = path.resolve(dir, "store.json");
  }

  private async read(): Promise<Data> {
    try {
      const raw = await fs.readFile(this.file, "utf8");
      const data = JSON.parse(raw) as Data;
      return { ...data, orders: data.orders ?? {}, queue: data.queue ?? [] };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return { orders: {}, queue: [] };
      throw err;
    }
  }

  private async write(data: Data) {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2));
    await fs.rename(tmp, this.file);
  }

  private run<T>(fn: (data: Data) => Promise<T> | T, save: boolean): Promise<T> {
    const next = this.chain.then(async () => {
      const data = await this.read();
      const result = await fn(data);
      if (save) await this.write(data);
      return result;
    });
    this.chain = next.catch(() => undefined);
    return next;
  }

  saveOrder(order: Order) {
    return this.run((d) => {
      d.orders[order.id] = order;
    }, true);
  }

  getOrder(id: string) {
    return this.run((d) => d.orders[id] ?? null, false);
  }

  updateOrder(id: string, patch: Partial<Order>) {
    return this.run((d) => {
      if (d.orders[id]) d.orders[id] = { ...d.orders[id], ...patch };
    }, true);
  }

  fulfillOrder(id: string, patch: Partial<Order>, deliveries: Delivery[]) {
    return this.run((d) => {
      const order = d.orders[id];
      if (!order || order.status === "paid") return false;
      d.orders[id] = { ...order, ...patch, status: "paid" };
      d.queue.push(...deliveries);
      return true;
    }, true);
  }

  pendingDeliveries(mode: string, limit: number) {
    return this.run((d) => d.queue.filter((x) => x.mode === mode).slice(0, limit), false);
  }

  ackDeliveries(mode: string, acks: DeliveryAck[]) {
    return this.run((d) => {
      let accepted = 0;
      for (const ack of acks) {
        const before = d.queue.length;
        d.queue = d.queue.filter((x) => !(x.id === ack.id && x.mode === mode));
        const order = d.orders[ack.order_id];
        const info = order?.mode === mode ? order.deliveries?.find((x) => x.id === ack.id) : undefined;
        if (info && rank(ack.state) > rank(info.state)) {
          info.state = ack.state;
          info.at = Date.now();
        }
        if (info || d.queue.length < before) accepted++;
      }
      return accepted;
    }, true);
  }

  async deliveryStates(order: Order): Promise<DeliveryInfo[]> {
    return order.deliveries ?? [];
  }

  drainDeliveries(modes: string[]) {
    return this.run((d) => {
      const taken = d.queue.filter((x) => modes.includes(x.mode));
      d.queue = d.queue.filter((x) => !modes.includes(x.mode));
      return taken;
    }, true);
  }

  listOrders(limit: number) {
    return this.run(
      (d) => Object.values(d.orders).sort((a, b) => b.createdAt - a.createdAt).slice(0, limit),
      false,
    );
  }

  getCatalog() {
    return this.run((d) => d.catalog ?? null, false);
  }

  saveCatalog(catalog: SavedCatalog) {
    return this.run((d) => {
      d.catalog = catalog;
    }, true);
  }

  getSettings() {
    return this.run((d) => d.settings ?? null, false);
  }

  saveSettings(settings: ShopSettings) {
    return this.run((d) => {
      d.settings = settings;
    }, true);
  }

  private imageFile(id: string) {
    return path.join(path.dirname(this.file), "images", `${id.replace(/[^a-z0-9-]/gi, "")}.txt`);
  }

  async saveImage(id: string, dataUrl: string) {
    await fs.mkdir(path.dirname(this.imageFile(id)), { recursive: true });
    await fs.writeFile(this.imageFile(id), dataUrl);
  }

  async getImage(id: string) {
    try {
      return await fs.readFile(this.imageFile(id), "utf8");
    } catch {
      return null;
    }
  }

  listRecent(limit: number) {
    return this.run(
      (d) =>
        Object.values(d.orders)
          .filter((o) => o.status === "paid" && o.paidAt)
          .sort((a, b) => b.paidAt! - a.paidAt!)
          .slice(0, limit)
          .map<RecentPurchase>((o) => ({ nick: o.nick, item: o.lines[0]?.name ?? "", at: o.paidAt! })),
      false,
    );
  }
}

/** Stan może iść tylko do przodu (ponowione potwierdzenie „received” nie cofa „claimed”). */
export const rank = (s: DeliveryInfo["state"]) => ({ queued: 0, received: 1, blocked: 2, claimed: 3 })[s];
