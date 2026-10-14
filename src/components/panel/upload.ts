"use client";

import { api } from "./PanelApp";

/** Zmniejsza zdjęcie w przeglądarce (max 512 px, WebP) – szybka strona i mała baza. */
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => fail(new Error("To nie jest obrazek."));
      i.src = url;
    });
    const scale = Math.min(1, 512 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const webp = canvas.toDataURL("image/webp", 0.88);
    return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Wgrywa zdjęcie do bazy strony, zwraca adres /api/img/… */
export async function uploadImage(file: File): Promise<string> {
  const data = await shrink(file);
  const d = await api<{ url: string }>("/api/panel/image", { method: "POST", body: JSON.stringify({ data }) });
  return d.url;
}
