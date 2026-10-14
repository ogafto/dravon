import type { Product } from "@/data/shop";

export type OrderLine = {
  variantId: string;
  productSlug: string;
  name: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
  total: number;
  /** Kopia komend i sposobu wydania z chwili zakupu (szablony z {nick} i {qty}). */
  game?: {
    commands: string[];
    broadcast: string;
    delivery?: "instant" | "stash";
    icon?: string;
    model?: string;
    stack?: boolean;
  };
};

export type OrderStatus = "pending" | "paid" | "failed" | "amount_mismatch";

export type Order = {
  id: string;
  mode: string;
  nick: string;
  email?: string;
  lines: OrderLine[];
  amount: number;
  status: OrderStatus;
  createdAt: number;
  paidAt?: number;
  transactionId?: string;
  simpayStatus?: string;
  /** Dostawy utworzone po opłaceniu (stan do strony „dziękujemy”). */
  deliveries?: DeliveryInfo[];
};

/**
 * Jak plugin wydaje produkt:
 *  - instant – komendy od razu (rangi, pieniądze – działają też, gdy gracza nie ma),
 *  - stash   – do skrytki /isodbierz; gracz odbiera, gdy ma miejsce w ekwipunku (przedmioty, klucze).
 */
export type DeliveryKind = "instant" | "stash";

/** Stan dostawy widoczny dla kupującego. */
export type DeliveryState = "queued" | "received" | "claimed" | "blocked";

/** Format wpisu zgodny ze starym pending_orders.json (+ pola v2) – plugin go parsuje. */
export type Delivery = {
  id: string;
  nick: string;
  product: string;
  quantity: number;
  price: string;
  command: string;
  broadcast_name: string;
  time: number;
  mode: string;
  order_id: string;
  /** v2 */
  kind?: DeliveryKind;
  /** Wszystkie komendy (command = pierwsza – dla starego pluginu). */
  commands?: string[];
  /** Nazwa do GUI skrytki, np. „Klucz Vampira”. */
  name?: string;
  /** Ikona w GUI: materiał MC i opcjonalny model z paczki (np. dravon:key_vampir). */
  icon?: string;
  model?: string;
};

/** Potwierdzenie od pluginu. */
export type DeliveryAck = { id: string; order_id: string; state: Exclude<DeliveryState, "queued"> };

export type DeliveryInfo = { id: string; name: string; quantity: number; kind?: DeliveryKind; state: DeliveryState; at?: number };

export type RecentPurchase = { nick: string; item: string; at: number };

/** Produkty zapisane z panelu: tryb → lista produktów (zastępuje domyślne z src/data/shop.ts). */
export type SavedCatalog = Record<string, Product[]>;

/** Ustawienia z panelu. announce – jak serwer ogłasza zakup (plugin pobiera je razem z dostawami). */
export type ShopSettings = {
  announce: { chat: boolean; title: boolean; bossbar: boolean; actionbar: boolean };
};

export interface Store {
  saveOrder(order: Order): Promise<void>;
  getOrder(id: string): Promise<Order | null>;
  updateOrder(id: string, patch: Partial<Order>): Promise<void>;
  /**
   * Atomowo oznacza zamówienie jako opłacone i dodaje dostawy do kolejki.
   * Zwraca false, jeśli zamówienie było już zrealizowane (SimPay potrafi wysłać IPN kilka razy).
   */
  fulfillOrder(id: string, patch: Partial<Order>, deliveries: Delivery[]): Promise<boolean>;
  /** Stary plugin: zwraca i usuwa oczekujące dostawy (opcjonalnie tylko dla jednego trybu). */
  drainDeliveries(modes: string[]): Promise<Delivery[]>;
  /** Plugin v2: oczekujące dostawy trybu BEZ usuwania – znikają dopiero po potwierdzeniu (ackDeliveries). */
  pendingDeliveries(mode: string, limit: number): Promise<Delivery[]>;
  /** Plugin v2: potwierdzenia (odebrano na serwerze / gracz odebrał / zablokowano). Zwraca liczbę przyjętych. */
  ackDeliveries(mode: string, acks: DeliveryAck[]): Promise<number>;
  /** Aktualne stany dostaw zamówienia. */
  deliveryStates(order: Order): Promise<DeliveryInfo[]>;
  /** Ostatnie opłacone zakupy (do paska „ostatnie zakupy”). */
  listRecent(limit: number): Promise<RecentPurchase[]>;
  /** Panel: ostatnie zamówienia (najnowsze pierwsze). */
  listOrders(limit: number): Promise<Order[]>;
  /** Panel: produkty (null = domyślne z kodu). */
  getCatalog(): Promise<SavedCatalog | null>;
  saveCatalog(catalog: SavedCatalog): Promise<void>;
  getSettings(): Promise<ShopSettings | null>;
  saveSettings(settings: ShopSettings): Promise<void>;
  /** Zdjęcia produktów wgrane w panelu (data URL, już zmniejszone w przeglądarce). */
  saveImage(id: string, dataUrl: string): Promise<void>;
  getImage(id: string): Promise<string | null>;
}
