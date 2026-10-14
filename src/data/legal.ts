// Treść przeniesiona 1:1 z poprzedniej strony (dokumenty.html).
// **pogrubienie** jest renderowane jako <strong>.

export type LegalItem = { type: "p" | "bullet"; text: string };
export type LegalSection = { heading: string; items: LegalItem[] };
export type LegalDoc = { title: string; updated: string; sections: LegalSection[] };

export const terms: LegalDoc = {
  "title": "Regulamin Sklepu Serwera Dravon.pl",
  "updated": "Ostatnia aktualizacja: 17 sierpnia 2026 r. | Sprzedaż usług i świadczeń cyfrowych",
  "sections": [
    {
      "heading": "§1. Postanowienia ogólne",
      "items": [
        {
          "type": "p",
          "text": "1. Sklep Dravon.pl prowadzi sprzedaż odpłatnych usług i świadczeń cyfrowych związanych z projektem Dravon.pl, w szczególności rang, pakietów, kosmetyki, dostępu do funkcji oraz innych elementów opisanych przy danym produkcie."
        },
        {
          "type": "p",
          "text": "2. Sprzedawcą jest **Dawid Kompalik**, e-mail: **dravon.pl@gmail.com** (dalej: „Sprzedawca”). Przed uruchomieniem sprzedaży dane te należy uzupełnić zgodnie z rzeczywistym statusem prawnym podmiotu."
        },
        {
          "type": "p",
          "text": "3. Regulamin określa zasady składania i realizacji zamówień, płatności, reklamacji, odstąpienia od umowy oraz świadczenia usług cyfrowych."
        },
        {
          "type": "p",
          "text": "4. Przed dokonaniem zakupu klient powinien zapoznać się z opisem produktu, ceną, sposobem i terminem realizacji oraz niniejszym Regulaminem."
        }
      ]
    },
    {
      "heading": "§2. Definicje",
      "items": [
        {
          "type": "p",
          "text": "1. **Klient** – osoba fizyczna, osoba prawna lub jednostka organizacyjna dokonująca zakupu."
        },
        {
          "type": "p",
          "text": "2. **Konsument** – osoba fizyczna dokonująca czynności prawnej niezwiązanej bezpośrednio z jej działalnością gospodarczą lub zawodową, a także podmiot korzystający z ochrony konsumenckiej w zakresie przewidzianym prawem."
        },
        {
          "type": "p",
          "text": "3. **Produkt cyfrowy / Usługa cyfrowa** – świadczenie dostarczane w formie cyfrowej, w szczególności wirtualna ranga, uprawnienie, funkcja lub pakiet na Serwerze."
        },
        {
          "type": "p",
          "text": "4. **Zamówienie** – oświadczenie Klienta zmierzające do zawarcia umowy sprzedaży lub świadczenia usługi."
        },
        {
          "type": "p",
          "text": "5. **Operator płatności** – zewnętrzny dostawca obsługujący płatność wybraną przez Klienta."
        }
      ]
    },
    {
      "heading": "§3. Zawarcie umowy i składanie zamówień",
      "items": [
        {
          "type": "p",
          "text": "1. Informacje prezentowane w Sklepie stanowią zaproszenie do zawarcia umowy w rozumieniu właściwych przepisów, chyba że wyraźnie wskazano inaczej."
        },
        {
          "type": "p",
          "text": "2. Klient składa zamówienie poprzez wykonanie czynności wskazanych w interfejsie Sklepu i podanie danych niezbędnych do realizacji zamówienia."
        },
        {
          "type": "p",
          "text": "3. Przed złożeniem zamówienia Klient otrzymuje informację o głównych cechach świadczenia, łącznej cenie oraz innych istotnych warunkach umowy."
        },
        {
          "type": "p",
          "text": "4. Umowa zostaje zawarta na zasadach wynikających z procesu zakupowego i właściwych przepisów prawa."
        }
      ]
    },
    {
      "heading": "§4. Ceny i płatności",
      "items": [
        {
          "type": "p",
          "text": "1. Ceny produktów są podawane w walucie wskazanej w Sklepie. Jeżeli Sprzedawca jest zobowiązany do naliczania VAT, cena prezentowana konsumentowi obejmuje należny podatek VAT."
        },
        {
          "type": "p",
          "text": "2. Dostępne metody płatności są prezentowane podczas składania zamówienia. Płatności mogą być obsługiwane przez zewnętrznych operatorów."
        },
        {
          "type": "p",
          "text": "3. Sprzedawca nie przechowuje danych kart płatniczych, jeżeli obsługa płatności odbywa się bezpośrednio przez zewnętrznego operatora."
        },
        {
          "type": "p",
          "text": "4. W przypadku nieudanej lub niezaksięgowanej płatności zamówienie może nie zostać zrealizowane do czasu potwierdzenia płatności."
        }
      ]
    },
    {
      "heading": "§5. Realizacja usług cyfrowych",
      "items": [
        {
          "type": "p",
          "text": "1. Usługi cyfrowe są dostarczane na konto lub nick wskazany przez Klienta w zamówieniu, zgodnie z opisem produktu."
        },
        {
          "type": "p",
          "text": "2. Standardowy czas automatycznej realizacji wynosi od kilku minut do czasu wskazanego w Sklepie. W przypadku opóźnienia wynikającego z awarii systemu Klient może zgłosić problem."
        },
        {
          "type": "p",
          "text": "3. Klient jest zobowiązany do podania prawidłowych danych. Sprzedawca nie ponosi odpowiedzialności za opóźnienie wynikające z podania błędnego nicku lub innych danych, z zastrzeżeniem praw konsumenta."
        },
        {
          "type": "p",
          "text": "4. Usługi cyfrowe nie są papierowymi bonami ani środkami pieniężnymi i nie mogą być przedstawiane jako pieniądz elektroniczny."
        }
      ]
    },
    {
      "heading": "§6. Zmiany usług, aktualizacje i kompatybilność",
      "items": [
        {
          "type": "p",
          "text": "1. Funkcjonalność usług może ulegać zmianom w związku z rozwojem Serwera, aktualizacjami Minecraft, zmianami technicznymi lub bezpieczeństwem."
        },
        {
          "type": "p",
          "text": "2. Jeżeli zmiana istotnie wpływa na zgodność lub sposób korzystania z usługi cyfrowej, prawa konsumenta wynikają z obowiązujących przepisów dotyczących zgodności treści i usług cyfrowych z umową."
        },
        {
          "type": "p",
          "text": "3. Sprzedawca nie gwarantuje funkcjonowania usługi w środowisku, które nie jest wspierane lub które zostało wyraźnie wyłączone w opisie produktu."
        }
      ]
    },
    {
      "heading": "§7. Prawo odstąpienia od umowy",
      "items": [
        {
          "type": "p",
          "text": "1. Konsument, który zawarł umowę na odległość, co do zasady ma ustawowe prawo odstąpienia od niej w terminie 14 dni, z zastrzeżeniem wyjątków przewidzianych prawem."
        },
        {
          "type": "p",
          "text": "2. W przypadku odpłatnego dostarczania treści cyfrowych niedostarczanych na nośniku materialnym, prawo odstąpienia może zostać wyłączone wyłącznie po spełnieniu ustawowych warunków, w szczególności po uzyskaniu uprzedniej i wyraźnej zgody Klienta na rozpoczęcie świadczenia przed upływem terminu odstąpienia, poinformowaniu go o utracie prawa oraz przekazaniu wymaganego potwierdzenia zawarcia umowy."
        },
        {
          "type": "p",
          "text": "3. Sam fakt zakupu lub automatycznego nadania świadczenia nie zastępuje wymaganych prawem zgód i informacji. Proces zakupowy powinien zawierać odpowiednie mechanizmy potwierdzające te czynności."
        },
        {
          "type": "p",
          "text": "4. Jeżeli ustawowe przesłanki wyłączenia prawa odstąpienia nie zostały spełnione, Klient zachowuje prawo do odstąpienia na zasadach określonych przepisami."
        }
      ]
    },
    {
      "heading": "§8. Reklamacje i zgodność usługi z umową",
      "items": [
        {
          "type": "p",
          "text": "1. Klient może złożyć reklamację, jeżeli usługa cyfrowa jest niezgodna z umową, nie została dostarczona, została dostarczona wadliwie lub wystąpił problem techniczny."
        },
        {
          "type": "p",
          "text": "2. Reklamację można złożyć na adres **dravon.pl@gmail.com** lub przez oficjalny system zgłoszeń, jeżeli taki kanał został udostępniony."
        },
        {
          "type": "p",
          "text": "3. Zgłoszenie powinno zawierać co najmniej nick, identyfikator lub numer zamówienia, opis problemu oraz – jeżeli jest dostępny – dowód płatności."
        },
        {
          "type": "p",
          "text": "4. Sprzedawca rozpatruje reklamację w terminie wynikającym z obowiązujących przepisów. Jeżeli dla danego rodzaju roszczenia przepisy przewidują krótszy lub szczególny termin, stosuje się ten termin."
        },
        {
          "type": "p",
          "text": "5. W przypadku braku zgodności usługi cyfrowej z umową konsument może korzystać z uprawnień przewidzianych ustawą o prawach konsumenta, w tym z żądania doprowadzenia usługi do zgodności, obniżenia ceny lub odstąpienia od umowy, jeżeli zachodzą przesłanki ustawowe."
        }
      ]
    },
    {
      "heading": "§9. Zwroty i anulowanie zamówienia",
      "items": [
        {
          "type": "p",
          "text": "1. Zwrot płatności następuje na zasadach wynikających z ustawy o prawach konsumenta lub innych właściwych przepisów."
        },
        {
          "type": "p",
          "text": "2. Jeżeli prawo przewiduje zwrot płatności, Sprzedawca dokonuje go w terminie i przy użyciu sposobu przewidzianego prawem, chyba że Klient wyraźnie zaakceptował inne rozwiązanie, które nie powoduje dla niego dodatkowych kosztów."
        },
        {
          "type": "p",
          "text": "3. Niezależnie od ustawowych uprawnień Sprzedawca może dobrowolnie zaoferować korzystniejsze warunki zwrotu."
        }
      ]
    },
    {
      "heading": "§10. Odpowiedzialność",
      "items": [
        {
          "type": "p",
          "text": "1. Żadne postanowienie Regulaminu nie wyłącza ani nie ogranicza odpowiedzialności Sprzedawcy w zakresie, w którym takie wyłączenie lub ograniczenie jest niedopuszczalne na podstawie bezwzględnie obowiązujących przepisów."
        },
        {
          "type": "p",
          "text": "2. Sprzedawca nie odpowiada za niedostępność usługi spowodowaną wyłącznie działaniem zewnętrznych dostawców, awarią infrastruktury internetowej lub urządzeniem Klienta, z zastrzeżeniem odpowiedzialności wynikającej z prawa."
        }
      ]
    },
    {
      "heading": "§11. Pozasądowe sposoby rozpatrywania sporów",
      "items": [
        {
          "type": "p",
          "text": "1. Konsument może korzystać z dostępnych pozasądowych sposobów rozwiązywania sporów konsumenckich na zasadach określonych w obowiązujących przepisach."
        },
        {
          "type": "p",
          "text": "2. Sprzedawca nie wyłącza prawa konsumenta do dochodzenia roszczeń przed właściwym sądem."
        }
      ]
    },
    {
      "heading": "§12. Postanowienia końcowe",
      "items": [
        {
          "type": "p",
          "text": "1. Regulamin nie narusza praw przyznanych konsumentowi na podstawie bezwzględnie obowiązujących przepisów."
        },
        {
          "type": "p",
          "text": "2. Zmiany Regulaminu mogą być dokonywane z ważnych przyczyn, w szczególności prawnych, technicznych lub organizacyjnych. Do umów zawartych przed zmianą stosuje się zasady wynikające z prawa."
        },
        {
          "type": "p",
          "text": "3. Regulamin wchodzi w życie z dniem publikacji."
        }
      ]
    }
  ]
};

export const privacy: LegalDoc = {
  "title": "Polityka Prywatności i Ochrony Danych Osobowych",
  "updated": "Ostatnia aktualizacja: 17 sierpnia 2026 r.",
  "sections": [
    {
      "heading": "§1. Informacje ogólne",
      "items": [
        {
          "type": "p",
          "text": "1. Niniejsza Polityka Prywatności określa zasady przetwarzania danych osobowych osób korzystających ze strony internetowej Dravon.pl, Sklepu, serwera Minecraft oraz powiązanych kanałów komunikacji."
        },
        {
          "type": "p",
          "text": "2. Polityka została przygotowana w celu zapewnienia przejrzystej informacji o tym, jakie dane mogą być przetwarzane, w jakich celach, na jakich podstawach prawnych, przez jaki okres oraz jakie prawa przysługują osobom, których dane dotyczą."
        },
        {
          "type": "p",
          "text": "3. Administrator przetwarza dane zgodnie z rozporządzeniem Parlamentu Europejskiego i Rady (UE) 2016/679 (RODO), właściwymi przepisami krajowymi oraz zasadami bezpieczeństwa i minimalizacji danych."
        }
      ]
    },
    {
      "heading": "§2. Administrator danych",
      "items": [
        {
          "type": "p",
          "text": "1. Administratorem danych osobowych jest **Dawid Kompalik**."
        },
        {
          "type": "p",
          "text": "2. Kontakt w sprawach związanych z ochroną danych osobowych: **dravon.pl@gmail.com**."
        },
        {
          "type": "p",
          "text": "3. Jeżeli Administrator wyznaczył Inspektora Ochrony Danych, jego dane kontaktowe są dostępne w miejscu wskazanym przez Administratora. Jeżeli IOD nie został wyznaczony, wszelkie sprawy dotyczące danych osobowych można kierować bezpośrednio do Administratora."
        }
      ]
    },
    {
      "heading": "§3. Zakres przetwarzanych danych",
      "items": [
        {
          "type": "p",
          "text": "1. Zakres danych zależy od sposobu korzystania z usług. W zależności od sytuacji mogą być przetwarzane:"
        },
        {
          "type": "bullet",
          "text": "nick lub identyfikator konta Minecraft;"
        },
        {
          "type": "bullet",
          "text": "identyfikator konta Discord lub dane związane z komunikacją z projektem;"
        },
        {
          "type": "bullet",
          "text": "adres e-mail;"
        },
        {
          "type": "bullet",
          "text": "dane niezbędne do obsługi płatności i rozliczeń, przy czym dane instrumentu płatniczego mogą być przetwarzane bezpośrednio przez operatora płatności;"
        },
        {
          "type": "bullet",
          "text": "adres IP, informacje o urządzeniu, przeglądarce i systemie operacyjnym;"
        },
        {
          "type": "bullet",
          "text": "informacje o dacie, czasie i sposobie korzystania z usług;"
        },
        {
          "type": "bullet",
          "text": "logi techniczne, bezpieczeństwa i zdarzeń serwerowych;"
        },
        {
          "type": "bullet",
          "text": "treść wiadomości kierowanych do Administratora, zgłoszeń, reklamacji i korespondencji;"
        },
        {
          "type": "bullet",
          "text": "informacje dotyczące zamówień, transakcji, zwrotów i reklamacji."
        },
        {
          "type": "p",
          "text": "2. Administrator nie zamierza pozyskiwać danych, które nie są niezbędne do określonego celu. Użytkownik powinien powstrzymać się od przekazywania w zgłoszeniach danych szczególnie wrażliwych, jeżeli nie są one potrzebne do rozpatrzenia sprawy."
        }
      ]
    },
    {
      "heading": "§4. Cele i podstawy prawne przetwarzania",
      "items": [
        {
          "type": "p",
          "text": "1. Dane osobowe mogą być przetwarzane w następujących celach:"
        },
        {
          "type": "bullet",
          "text": "**zawarcie i wykonanie umowy** – art. 6 ust. 1 lit. b RODO, w szczególności obsługa zamówień, realizacja usług cyfrowych i kontakt dotyczący zamówienia;"
        },
        {
          "type": "bullet",
          "text": "**realizacja obowiązków prawnych** – art. 6 ust. 1 lit. c RODO, w szczególności obowiązki podatkowe, rachunkowe i związane z obsługą praw konsumenta;"
        },
        {
          "type": "bullet",
          "text": "**prawnie uzasadniony interes Administratora** – art. 6 ust. 1 lit. f RODO, m.in. bezpieczeństwo infrastruktury, przeciwdziałanie nadużyciom, dochodzenie lub obrona roszczeń oraz zapewnienie ciągłości działania usług;"
        },
        {
          "type": "bullet",
          "text": "**zgoda** – art. 6 ust. 1 lit. a RODO, jeżeli przetwarzanie wymaga zgody, np. w zakresie wybranych technologii analitycznych lub marketingowych;"
        },
        {
          "type": "bullet",
          "text": "**ustalenie, dochodzenie lub obrona roszczeń** – w zakresie, w którym podstawę stanowi prawnie uzasadniony interes Administratora."
        }
      ]
    },
    {
      "heading": "§5. Dane techniczne i logi",
      "items": [
        {
          "type": "p",
          "text": "1. Podczas korzystania ze strony lub usług mogą być automatycznie zapisywane informacje techniczne, takie jak adres IP, data i godzina połączenia, żądany zasób, informacje o przeglądarce oraz zdarzenia związane z bezpieczeństwem."
        },
        {
          "type": "p",
          "text": "2. Dane techniczne mogą być wykorzystywane do wykrywania prób ataków, nadużyć, oszustw, nieautoryzowanego dostępu i innych zdarzeń mogących zagrażać infrastrukturze."
        },
        {
          "type": "p",
          "text": "3. Zakres oraz okres przechowywania logów powinien być ograniczony do okresu niezbędnego do realizacji celu, dla którego zostały utworzone, z uwzględnieniem obowiązków prawnych i możliwości dochodzenia roszczeń."
        }
      ]
    },
    {
      "heading": "§6. Zamówienia i płatności",
      "items": [
        {
          "type": "p",
          "text": "1. W związku z zakupem produktu Administrator może przetwarzać dane potrzebne do identyfikacji zamówienia, kontaktu z kupującym, realizacji świadczenia, obsługi reklamacji oraz spełnienia obowiązków księgowych i podatkowych."
        },
        {
          "type": "p",
          "text": "2. Płatności mogą być obsługiwane przez niezależnych operatorów płatności. Operator może przetwarzać dane zgodnie z własną polityką prywatności oraz wymaganiami dotyczącymi bezpieczeństwa transakcji."
        },
        {
          "type": "p",
          "text": "3. Administrator nie powinien żądać od użytkownika przesyłania pełnych danych karty płatniczej, haseł bankowych ani kodów autoryzacyjnych za pośrednictwem wiadomości prywatnych."
        }
      ]
    },
    {
      "heading": "§7. Odbiorcy danych",
      "items": [
        {
          "type": "p",
          "text": "1. Dane mogą być przekazywane podmiotom, które wspierają Administratora w prowadzeniu usług, wyłącznie w zakresie niezbędnym do realizacji określonych celów."
        },
        {
          "type": "p",
          "text": "2. Mogą to być w szczególności: dostawca hostingu i serwerów, operator płatności, dostawca poczty elektronicznej, dostawca systemu obsługi zgłoszeń, dostawca narzędzi technicznych oraz podmioty świadczące usługi księgowe lub prawne."
        },
        {
          "type": "p",
          "text": "3. Jeżeli dany dostawca przetwarza dane w imieniu Administratora, Administrator zawiera odpowiednią umowę powierzenia lub korzysta z innej właściwej podstawy prawnej."
        },
        {
          "type": "p",
          "text": "4. Dane mogą być również ujawnione właściwym organom publicznym, jeżeli obowiązek taki wynika z przepisów prawa."
        }
      ]
    },
    {
      "heading": "§8. Przekazywanie danych poza Europejski Obszar Gospodarczy",
      "items": [
        {
          "type": "p",
          "text": "1. Jeżeli Administrator korzysta z usług dostawcy, którego infrastruktura lub podwykonawcy wiążą się z przekazywaniem danych poza Europejski Obszar Gospodarczy, przekazanie odbywa się z zastosowaniem odpowiedniego mechanizmu przewidzianego przez RODO, jeżeli taki mechanizm jest wymagany."
        },
        {
          "type": "p",
          "text": "2. Informacje o konkretnych dostawcach i stosowanych mechanizmach mogą być udostępniane Użytkownikowi na jego uzasadnione żądanie lub wskazane w odpowiednich dokumentach dostawców."
        }
      ]
    },
    {
      "heading": "§9. Okres przechowywania danych",
      "items": [
        {
          "type": "p",
          "text": "1. Dane są przechowywane przez okres nie dłuższy, niż jest to niezbędne do realizacji celu ich przetwarzania, z uwzględnieniem obowiązków prawnych."
        },
        {
          "type": "p",
          "text": "2. Dane związane z umową i rozliczeniami mogą być przechowywane przez okres wymagany przepisami podatkowymi i rachunkowymi."
        },
        {
          "type": "p",
          "text": "3. Dane dotyczące roszczeń mogą być przechowywane przez okres niezbędny do ich ustalenia, dochodzenia lub obrony."
        },
        {
          "type": "p",
          "text": "4. Dane przetwarzane na podstawie zgody są przechowywane do czasu jej wycofania, chyba że istnieje inna podstawa prawna dalszego przetwarzania."
        },
        {
          "type": "p",
          "text": "5. Po upływie właściwego okresu dane są usuwane, anonimizowane albo poddawane innemu procesowi zapewniającemu ich dalsze przetwarzanie wyłącznie w zakresie dozwolonym prawem."
        }
      ]
    },
    {
      "heading": "§10. Prawa osoby, której dane dotyczą",
      "items": [
        {
          "type": "p",
          "text": "1. Osobie, której dane dotyczą, przysługuje – w zakresie przewidzianym RODO – prawo do:"
        },
        {
          "type": "bullet",
          "text": "dostępu do danych osobowych;"
        },
        {
          "type": "bullet",
          "text": "uzyskania kopii danych;"
        },
        {
          "type": "bullet",
          "text": "sprostowania danych nieprawidłowych lub uzupełnienia danych niekompletnych;"
        },
        {
          "type": "bullet",
          "text": "usunięcia danych („prawo do bycia zapomnianym”), jeżeli zachodzą przesłanki ustawowe;"
        },
        {
          "type": "bullet",
          "text": "ograniczenia przetwarzania;"
        },
        {
          "type": "bullet",
          "text": "przenoszenia danych, jeżeli przetwarzanie odbywa się na podstawie zgody lub umowy i w sposób zautomatyzowany;"
        },
        {
          "type": "bullet",
          "text": "wniesienia sprzeciwu wobec przetwarzania opartego na prawnie uzasadnionym interesie, z przyczyn związanych ze szczególną sytuacją osoby;"
        },
        {
          "type": "bullet",
          "text": "wniesienia sprzeciwu wobec przetwarzania danych do celów marketingu bezpośredniego;"
        },
        {
          "type": "bullet",
          "text": "cofnięcia zgody w dowolnym momencie, jeżeli przetwarzanie odbywa się na podstawie zgody."
        }
      ]
    },
    {
      "heading": "§11. Prawo do wniesienia skargi",
      "items": [
        {
          "type": "p",
          "text": "1. Osoba, której dane dotyczą, ma prawo wnieść skargę do organu nadzorczego, jeżeli uzna, że przetwarzanie jej danych narusza przepisy dotyczące ochrony danych osobowych."
        },
        {
          "type": "p",
          "text": "2. W Polsce właściwym organem nadzorczym jest **Prezes Urzędu Ochrony Danych Osobowych (UODO)**."
        }
      ]
    },
    {
      "heading": "§12. Pliki cookies i podobne technologie",
      "items": [
        {
          "type": "p",
          "text": "1. Strona może wykorzystywać pliki cookies oraz podobne technologie w celu zapewnienia prawidłowego działania strony, utrzymania sesji, zapamiętywania ustawień, zapewnienia bezpieczeństwa oraz – jeżeli zostały wdrożone i użytkownik wyrazi odpowiednią zgodę – prowadzenia analityki lub działań marketingowych."
        },
        {
          "type": "p",
          "text": "2. Cookies niezbędne do świadczenia żądanej przez użytkownika usługi mogą być wykorzystywane bez zgody, jeżeli ich stosowanie jest konieczne do działania strony."
        },
        {
          "type": "p",
          "text": "3. Cookies analityczne, marketingowe lub inne technologie wymagające zgody są uruchamiane zgodnie z obowiązującymi zasadami dotyczącymi zgody użytkownika."
        },
        {
          "type": "p",
          "text": "4. Użytkownik może kontrolować cookies za pomocą ustawień przeglądarki oraz, jeżeli strona udostępnia taki mechanizm, panelu ustawień prywatności."
        }
      ]
    },
    {
      "heading": "§13. Bezpieczeństwo danych",
      "items": [
        {
          "type": "p",
          "text": "1. Administrator stosuje odpowiednie środki techniczne i organizacyjne mające chronić dane przed przypadkowym lub bezprawnym zniszczeniem, utratą, modyfikacją, nieuprawnionym ujawnieniem lub dostępem."
        },
        {
          "type": "p",
          "text": "2. Środki bezpieczeństwa są dobierane z uwzględnieniem charakteru danych, ryzyka, kosztów wdrożenia oraz stanu wiedzy technicznej."
        },
        {
          "type": "p",
          "text": "3. W przypadku naruszenia ochrony danych Administrator podejmuje działania wymagane przez RODO, w tym – jeżeli zachodzą przesłanki – zgłoszenie naruszenia organowi nadzorczemu oraz zawiadomienie osób, których naruszenie dotyczy."
        }
      ]
    },
    {
      "heading": "§14. Zautomatyzowane podejmowanie decyzji i profilowanie",
      "items": [
        {
          "type": "p",
          "text": "1. Dane Użytkowników nie są wykorzystywane do podejmowania wobec nich decyzji wywołujących skutki prawne lub w podobny sposób istotnie na nich wpływających wyłącznie w sposób zautomatyzowany, chyba że Administrator poinformuje o takim mechanizmie i zapewni prawa wymagane przez przepisy prawa."
        },
        {
          "type": "p",
          "text": "2. Jeżeli w ramach usług wykorzystywane są narzędzia analityczne lub profilujące, ich zakres, cel i podstawa prawna zostaną odpowiednio opisane oraz – jeżeli jest to wymagane – poprzedzone uzyskaniem zgody."
        }
      ]
    },
    {
      "heading": "§15. Dane osób małoletnich",
      "items": [
        {
          "type": "p",
          "text": "1. Usługi Dravon.pl mogą być dostępne dla osób małoletnich. Administrator nie zamierza celowo pozyskiwać danych w zakresie wykraczającym poza potrzeby świadczenia usług."
        },
        {
          "type": "p",
          "text": "2. Jeżeli określona czynność wymaga zgody przedstawiciela ustawowego na podstawie obowiązujących przepisów, zastosowanie mają właściwe wymogi prawne."
        }
      ]
    },
    {
      "heading": "§16. Zmiany Polityki Prywatności",
      "items": [
        {
          "type": "p",
          "text": "1. Polityka Prywatności może być aktualizowana w szczególności w związku ze zmianą przepisów, zakresu usług, wykorzystywanych narzędzi, dostawców lub sposobu przetwarzania danych."
        },
        {
          "type": "p",
          "text": "2. Aktualna wersja Polityki jest publikowana na stronie Dravon.pl wraz z datą ostatniej aktualizacji."
        },
        {
          "type": "p",
          "text": "3. Jeżeli zmiana wymaga dodatkowego poinformowania osoby, której dane dotyczą, Administrator podejmie działania wymagane przez obowiązujące przepisy."
        }
      ]
    },
    {
      "heading": "§17. Kontakt w sprawach prywatności",
      "items": [
        {
          "type": "p",
          "text": "1. Wnioski dotyczące realizacji praw, pytań dotyczących przetwarzania danych oraz zgłoszenia dotyczące prywatności należy kierować na: **dravon.pl@gmail.com**."
        },
        {
          "type": "p",
          "text": "2. W celu bezpieczeństwa Administrator może poprosić o informacje pozwalające potwierdzić tożsamość osoby składającej wniosek, jeżeli jest to niezbędne do ochrony danych przed udostępnieniem osobie nieuprawnionej."
        },
        {
          "type": "p",
          "text": "3. Odpowiedzi na żądania są udzielane w terminach i na zasadach określonych w RODO."
        }
      ]
    },
    {
      "heading": "§18. Postanowienia końcowe",
      "items": [
        {
          "type": "p",
          "text": "1. W sprawach nieuregulowanych niniejszą Polityką zastosowanie mają przepisy RODO oraz właściwe przepisy prawa polskiego."
        },
        {
          "type": "p",
          "text": "2. Jeżeli którekolwiek postanowienie Polityki okaże się niezgodne z obowiązującymi przepisami, pozostałe postanowienia pozostają w mocy w zakresie, w jakim jest to prawnie dopuszczalne."
        }
      ]
    }
  ]
};
