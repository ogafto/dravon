# Wdrożenie strony na Vercel (dla Ciebie, nie dla klienta)

## 1. Projekt
1. Wrzuć folder `dravon-next` do repozytorium na GitHubie (prywatne).
2. Vercel → **Add New → Project** → wybierz repozytorium → Framework: Next.js (sam wykryje) → **Deploy**.

## 2. Baza (bez niej zamówienia by znikały)
Vercel → projekt → **Storage → Create / Connect → Upstash (Redis)** → plan Free → **Connect** do projektu.
Vercel sam doda zmienne `KV_REST_API_URL` i `KV_REST_API_TOKEN` – strona ich używa.

## 3. Zmienne (Settings → Environment Variables)

| Zmienna | Skąd |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | adres strony, np. `https://dravon.pl` (albo `https://twoj-projekt.vercel.app` do pokazu) |
| `SIMPAY_API_KEY` | panel SimPay klienta → Konto Klienta → API → Bearer Token |
| `SIMPAY_SERVICE_ID` | panel SimPay → Płatności online → Usługi → ID usługi |
| `SIMPAY_IPN_KEY` | panel SimPay → szczegóły usługi → Klucz IPN |
| `SIMPAY_VERIFY_IP` | `true` (na Vercelu IP jest prawdziwe) |
| `PLUGIN_TOKEN` | długi losowy kod – ten sam wpisujesz w `plugins/DravonSklep/config.yml` |
| `ADMIN_PASSWORD` | hasło do panelu `/panel` – długie, dajesz klientowi |
| `MC_SERVER_ADDRESS` | adres serwera MC (licznik graczy) |

Po ustawieniu: **Deployments → … → Redeploy**.

## 4. SimPay (u klienta w panelu SimPay)
- Usługa płatności online musi mieć zaakceptowaną domenę strony (SimPay sprawdza stronę przy zakładaniu usługi).
- **Adres IPN (powiadomienia):** `https://TWOJA-DOMENA/api/ipn`
- Linki powrotu ustawia strona sama.

Przebieg: gracz płaci → SimPay wysyła potwierdzenie na `/api/ipn` (z podpisem – fałszywego nie przyjmie,
kwota musi się zgadzać) → zakup trafia do kolejki → plugin na serwerze pobiera go w kilka sekund.

## 5. Domena
Vercel → Settings → Domains → dodaj `dravon.pl` i ustaw rekordy DNS, które pokaże Vercel.
Potem zmień `NEXT_PUBLIC_SITE_URL` i adres IPN w SimPay na domenę.

## 6. Sprawdzenie
1. `https://TWOJA-DOMENA/panel` → zaloguj się hasłem z `ADMIN_PASSWORD`.
2. Na serwerze MC: `/isodbierz admin status` → „Ostatnie udane połączenie: kilka s temu”.
3. Testowy zakup najtańszego produktu (np. ustaw w panelu produkt za 1 zł, ukryj go potem).

## Jak pokazać klientowi
- Daj mu link do strony i do `/panel` + hasło. W panelu widzi zakupy, zmienia ceny, dodaje produkty z komendami,
  wybiera ogłoszenie zakupu na serwerze.
- Najmocniejszy pokaz: na żywo kupcie produkt za 1 zł – po kilku sekundach przychodzi na serwer, a w panelu
  i na stronie „dziękujemy” zmienia się stan: czeka → w skrytce → odebrane.
