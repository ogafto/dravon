import "server-only";
import { randomUUID } from "node:crypto";
import { findVariant, fillTemplate, isInstantCommand, splitCommands } from "@/lib/catalog";
import { getModes } from "@/lib/shop-data";
import type { Delivery, DeliveryKind, Order } from "@/lib/store";

/**
 * Dostawy opłaconego zamówienia (wspólne dla SimPay – /api/ipn – i paysafecard – /api/plugin/psc „nadaj”):
 * rangi i pieniądze od razu (instant), przedmioty do skrytki /isodbierz (stash).
 */
export async function buildDeliveries(order: Order): Promise<Delivery[]> {
  const modes = await getModes();
  const time = Math.floor(Date.now() / 1000);
  return order.lines.flatMap((line) => {
    // wspólny koszyk (user 27.11): każda pozycja trafia na serwer swojego trybu
    const modeId = line.mode ?? order.mode;
    const mode = modes.find((m) => m.slug === modeId);
    // 1) kopia z chwili zakupu, 2) aktualny katalog (zamówienia sprzed panelu)
    let game = line.game;
    if (!game && mode) {
      const found = findVariant(mode, line.variantId);
      if (found) {
        game = {
          ...splitCommands(found.product, found.variant),
          broadcast: found.variant.broadcast,
          icon: found.product.game?.icon,
          model: found.product.game?.model,
          stack: !!found.product.stack,
        };
      }
    }
    if (!game) {
      console.error(`[ipn] Brak produktu ${line.variantId} dla zamówienia ${order.id}, dostawa pominięta`);
      return [];
    }
    let { instant = [], stash = [] } = game;
    if (!instant.length && !stash.length && game.commands?.length) {
      // zapis z wersji przed podziałem komend
      if ((game.delivery ?? (game.commands.every(isInstantCommand) ? "instant" : "stash")) === "instant") instant = game.commands;
      else stash = game.commands;
    }
    const broadcast = game.broadcast;
    const fill = (list: string[]) => list.map((c) => fillTemplate(c, order.nick, line.quantity));
    const title = game.stack ? `${line.name} ×${line.quantity}` : `${line.name} · ${line.variantLabel}`;
    const parts: { kind: DeliveryKind; commands: string[]; name: string; icon?: string; model?: string }[] = [];
    if (instant.length) {
      const both = stash.length > 0;
      parts.push({ kind: "instant", commands: fill(instant), name: both ? `${title} (ranga)` : title, icon: both ? "NAME_TAG" : game.icon, model: both ? undefined : game.model });
    }
    if (stash.length) parts.push({ kind: "stash", commands: fill(stash), name: title, icon: game.icon, model: game.model });
    return parts.map((part, i) => ({
      id: randomUUID(),
      nick: order.nick,
      product: line.variantId,
      quantity: line.quantity,
      price: i === 0 ? line.total.toFixed(2) : "0.00",
      command: part.commands[0],
      broadcast_name: fillTemplate(broadcast, order.nick, line.quantity),
      time,
      mode: modeId,
      order_id: order.id,
      kind: part.kind,
      commands: part.commands,
      name: part.name,
      icon: part.icon,
      model: part.model,
      // pakiet = dwie dostawy (ranga + skrytka), ogłaszamy go raz
      announce: i === 0,
    }));
  });
}

export const deliveryInfo = (list: Delivery[]) =>
  list.map((d) => ({ id: d.id, name: d.name ?? d.product, quantity: d.quantity, kind: d.kind, state: "queued" as const }));

