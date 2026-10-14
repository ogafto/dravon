# Dravon.pl – strona i sklep (Next.js)

Strona serwera Minecraft Dravon.pl z wielotrybowym sklepem, płatnościami SimPay i automatyczną dostawą przez plugin.

## Uruchomienie

```bash
npm install
cp .env.example .env.local   # uzupełnij wartości
npm run dev                  # http://localhost:3000
```

Produkcja (VPS):

```bash
npm run build
npm start                    # domyślnie port 3000, za reverse proxy (nginx/Caddy)
```

## Konfiguracja (`.env.local`)

| Zmienna | Opis |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Publiczny adres, np. `https://dravon.pl` – na niego SimPay wraca po płatności |
| `SIMPAY_API_KEY` | SimPay → Konto Klienta → API → Bearer Token |
| `SIMPAY_SERVICE_ID` | SimPay → Płatności online → Usługi → ID usługi |
| `SIMPAY_IPN_KEY` | **Wymagane w produkcji.** Klucz IPN z ustawień usługi – bez niego powiadomienia są odrzucane |
| `SIMPAY_VERIFY_IP` | `true` = dodatkowo sprawdzaj IP nadawcy IPN (wymaga, by serwer widział prawdziwe IP) |
| `PLUGIN_TOKEN` | Token, którym plugin MC pobiera zamówienia (ten sam co w starym `get_orders.php`) |
| `MC_SERVER_ADDRESS` | Adres serwera do licznika graczy |
| `DATA_DIR` | Folder z bazą zamówień (`store.json`) – domyślnie `./data` |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Zamiast pliku – Redis (wymagane na Vercelu / serverless) |

## Panel SimPay

- **Adres URL IPN:** `https://dravon.pl/api/ipn` (stary `https://dravon.pl/api/ipn.php` też działa)
- Linki powrotu ustawia aplikacja automatycznie (`/platnosc/sukces`, `/platnosc/blad`).

## Plugin na serwerze Minecraft (DravonSklep)

Plugin `dravon-plugins/DravonSklep` co kilka sekund pyta stronę o zakupy swojego trybu:

- `GET /api/plugin/deliveries?mode=skypvp` (nagłówek `Authorization: Bearer <PLUGIN_TOKEN>`) – oczekujące dostawy,
  **nie znikają przy odczycie**,
- `POST /api/plugin/ack` `{ mode, acks: [{ id, order_id, state }] }` – plugin potwierdza: `received` (zapisał u siebie –
  dostawa znika z kolejki), `claimed` (gracz dostał), `blocked` (komenda spoza białej listy w pluginie).

Dzięki temu zakup nie ginie, gdy serwer jest wyłączony albo padnie w trakcie – przyjdzie ponownie, a plugin pomija
znane id. Stan dostawy widać na stronie „dziękujemy” (czeka na serwer → w skrytce /isodbierz → odebrane).
Sposób wydania ustawia pole `game` produktu w `src/data/shop.ts` (`instant` – rangi, `stash` – skrytka).

Stary endpoint `GET /api/get_orders.php?token=...` działa dalej (zwraca i czyści kolejkę) – dla starego pluginu.

## Produkty i tryby

Wszystko w [`src/data/shop.ts`](src/data/shop.ts): tryby, kategorie, ceny, komendy (`{nick}`, `{qty}`), opisy i korzyści.
Tryb ze `status: "soon"` jest widoczny jako „Wkrótce” i nie przyjmuje zamówień.
Ceny są zawsze liczone na serwerze – klient nie może ich zmienić.

Regulamin i polityka prywatności: [`src/data/legal.ts`](src/data/legal.ts).

## Bezpieczeństwo (zmiany względem wersji PHP)

- Weryfikacja podpisu IPN (SHA-256) – wcześniej każdy mógł „opłacić” zamówienie fałszywym żądaniem.
- Sprawdzanie kwoty z IPN względem zamówienia i blokada podwójnej realizacji przy ponownym IPN.
- Walidacja nicku (wchodzi do komend konsoli) i ilości (wcześniej dało się wysłać ilość ujemną).
- Klucze w zmiennych środowiskowych zamiast w kodzie; dane zamówień poza katalogiem publicznym.
- Płatności rozpoczęte jeszcze w starym sklepie (control `nick|produkt:ilość`) są nadal realizowane.

## Wygląd

- Styl jak na stronach dużych serwerów: krój **Minercraftory** (nagłówki, przyciski, ceny, nawigacja), **Inter** do treści,
  neutralne grafitowe tła, płaskie przyciski z ciemnym paskiem u dołu, fiolet tylko jako akcent (`--accent` w `globals.css`).
- Font: `src/fonts/Minercraftory-PL.ttf` – Minercraftory (GrandChaos9000, **CC BY-SA 3.0**) z dorysowanymi polskimi
  znakami oraz `+ · / : %`. Budowany skryptem `python3 scripts/build-font.py` (wymaga `pip install fonttools`).
  Licencja i atrybucja: `src/fonts/Minercraftory-LICENSE.txt` – przy publikacji zostaw informację o autorze.
- Grafiki klienta: `public/mascot.png` (render maskotki w hero), `public/bg-left.jpg` i `bg-right.jpg`
  (fragmenty tła z banerów – rozmyte tło hero), banery produktów w `public/items`.
- Postać 3D (`src/components/three/Character3D.tsx`, skinview3d) jest użyta tam, gdzie ma funkcję:
  w koszyku pokazuje skin kupującego z prefiksem rangi, na stronie rangi – podgląd prefiksu.
- **Rendery 3D przedmiotów** (głowy rang, klucze, skrzynie, VexBox, odłamek, bloki trybów) w `public/renders`
  generuje `node scripts/render-items.mjs` (Three.js + Playwright, bez Blendera). Modele i kolory są w
  `scripts/render/scene.js` – np. `node scripts/render-items.mjs rank-vip` przerenderuje jedną grafikę.
  Każdy produkt ma pole `render` w `src/data/shop.ts`.
- Skiny postaci rang generuje `python3 scripts/generate-skins.py`; wygląd rang (skin, prefiks, kolor) – pole `showcase` w `src/data/shop.ts`.
- „Ostatnie zakupy” pojawiają się automatycznie przy co najmniej 3 opłaconych zamówieniach,
  liczniki Discorda pobierane są z publicznego API zaproszenia (odświeżanie co 5 min).

## Pod przyszły CMS

- `highlight` (plakietka „Polecane”) – na razie tylko na Pakiecie SVIP; docelowo przełącznik w panelu.
- Produkty i tryby są w `src/data/shop.ts` w formacie gotowym do przeniesienia do bazy/API
  (pola: `render`, `renderHover`, `fx` – rodzaj animacji: `chest | glint | shake | sparkle`).
- Nowe grafiki do produktów generuje `node scripts/render-items.mjs` (skrzynie: `fancyChest`, klucze: `crystalKey`).

## Modele do Minecrafta

`minecraft/DravonPack` – resource pack z tymi samymi modelami 3D co na stronie (klucze, VexBox, skrzynie).
Instrukcja: [`minecraft/README.md`](minecraft/README.md).

## Przed startem (checklista)

1. `.env.local` → uzupełnij `SIMPAY_IPN_KEY` (panel SimPay) i ustaw `NEXT_PUBLIC_SITE_URL=https://dravon.pl`.
2. Wymień klucz API SimPay i token pluginu (stare były zapisane jawnie w plikach PHP).
3. `src/data/shop.ts` → prawdziwe korzyści rang i komendy dla VexBoxa, pakietów i odłamka (teraz zaślepki).
4. Drugi tryb (`wkrotce`) – nazwa i produkty albo zostaw jako „Wkrótce”.
5. Panel SimPay → adres IPN: `https://dravon.pl/api/ipn`.
6. Hosting: `npm ci && npm run build && npm start` (VPS z dyskiem) albo Vercel + Upstash Redis.
7. Usuń stary `api/debug.txt` z obecnego serwera (publicznie widoczne dane transakcji).
