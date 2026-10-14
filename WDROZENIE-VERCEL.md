# Wdrożenie strony na Vercel (dla Ciebie, nie dla klienta)

Na Vercelu ustawiasz tylko bazę. Cała reszta (SimPay, token pluginu, IP serwera, Discord, tryby,
produkty, hasło) jest w panelu `/panel`.

## 1. Projekt
Vercel → **Add New → Project** → repozytorium `ogafto/dravon` → **Deploy**.

## 2. Baza (wymagana)
Vercel → projekt → **Storage → Create / Connect → Upstash (Redis)** → plan Free → **Connect** do projektu.
Vercel sam doda `KV_REST_API_URL` i `KV_REST_API_TOKEN`. Potem **Deployments → … → Redeploy**.

## 3. Pierwsze wejście do panelu – OD RAZU po wdrożeniu
Wejdź na `https://TWOJA-DOMENA/panel`. Panel nie ma jeszcze hasła, więc poprosi o ustawienie nowego
(min. 10 znaków). Zrób to od razu, zanim ktoś inny trafi na stronę. Hasło możesz potem zmienić w zakładce **Strona**.

## 4. Ustawienia w panelu
| Zakładka | Co ustawić |
| --- | --- |
| **Płatności** | klucz API, ID usługi i klucz IPN z panelu SimPay klienta → **Sprawdź połączenie**. Skopiuj **adres IPN** i wklej go w SimPay (ustawienia usługi). |
| **Serwer i plugin** | **Wygeneruj token** → wklej go w `plugins/DravonSklep/config.yml` na serwerze. Ogłoszenia, wygląd, Discord. |
| **Strona** | nazwa, IP serwera, Discord, adres strony (np. `https://dravon.pl`). |
| **Tryby** | tryby sklepu (nowe, nazwy, „Wkrótce”). |
| **Produkty i ceny** | produkty, ceny, zdjęcia, komendy (pakiet: ranga w „Od razu”, przedmioty w „Do skrytki”). |

## 5. SimPay (po stronie klienta)
- Usługa płatności online musi mieć zaakceptowaną domenę strony.
- Adres IPN = ten z zakładki **Płatności** (`https://TWOJA-DOMENA/api/ipn`).

## 6. Domena
Vercel → Settings → Domains → dodaj domenę i ustaw rekordy DNS. Potem w panelu → **Strona** → adres strony.

## Opcjonalnie: zmienne środowiskowe
Działają jako zapas, gdy w panelu coś jest puste: `SIMPAY_API_KEY`, `SIMPAY_SERVICE_ID`, `SIMPAY_IPN_KEY`,
`SIMPAY_VERIFY_IP`, `PLUGIN_TOKEN`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_SITE_URL`, `MC_SERVER_ADDRESS`.

## Jak pokazać klientowi
Daj mu link do strony, `/panel` i hasło. Najmocniejszy pokaz: w panelu produkt za 1 zł → kupcie go na żywo →
po kilku sekundach jest na serwerze, a w panelu (Zakupy) widać: czeka → w skrytce → wydane.
