import { getStore } from "@/lib/store";

/** Zdjęcia produktów wgrane w panelu. Adres się nie zmienia (nowe zdjęcie = nowe id), więc cache na rok. */
export async function GET(_req: Request, ctx: RouteContext<"/api/img/[id]">) {
  const { id } = await ctx.params;
  if (!/^[a-f0-9-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const data = await getStore().getImage(id);
  const match = data?.match(/^data:(image\/(?:png|webp|jpeg));base64,(.+)$/);
  if (!match) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(match[2], "base64"), {
    headers: { "Content-Type": match[1], "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
