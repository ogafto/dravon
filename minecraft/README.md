# Dravon.pl – modele przedmiotów do Minecrafta

Folder `DravonPack` to gotowy **resource pack (Java 1.21.4+)** z tymi samymi modelami 3D, które są na stronie:

| Plik | Przedmiot |
| --- | --- |
| `key_normal` | Klucz zwykły (złoty, błękitny klejnot) |
| `key_vampir` | Klucz vampira (krwisty, skrzydła nietoperza) |
| `vexbox` | VexBox – klatka ze świecącym rdzeniem i znakiem „?” |
| `chest_vip` / `chest_svip` / `chest_vampir` | Skrzynie pakietów (Vampir z kłami i oczami) |

Modele to zwykłe pliki JSON (`assets/dravon/models/item/*.json`) + tekstury (`assets/dravon/textures/item/*.png`),
więc można je też otworzyć i poprawić w **Blockbench** (File → Open Model).

## Jak użyć na serwerze

1. Spakuj **zawartość** folderu `DravonPack` do ZIP (w środku ZIP-a ma być od razu `pack.mcmeta` i `assets`).
2. Wgraj ZIP jako server resource pack (`server.properties` → `resource-pack=` + `resource-pack-sha1=`)
   albo daj graczom do ręcznej instalacji.
3. Przedmiot z modelem daje się komponentem `item_model`, np. klucz dla pluginu skrzyń:

   ```
   /give @p tripwire_hook[item_model="dravon:key_vampir",custom_name='"Klucz Vampira"']
   ```

   W pluginach (CrazyCrates, ExcellentCrates itp.) ustaw w konfiguracji klucza `item_model: dravon:key_vampir`
   (pole różnie się nazywa w zależności od pluginu/wersji).

`pack_format` w `pack.mcmeta` to 46 (1.21.4) z zakresem obsługiwanych wersji do nowszych – przy innej wersji serwera
zmień tę wartość.

## Jak wygenerować ponownie

Modele powstają z kodu – ten sam skrypt robi grafiki na stronę i paczkę:

```bash
node scripts/render-items.mjs              # rendery na stronę + paczka Minecraft
node scripts/render-items.mjs --minecraft  # tylko paczka
```

Kształty i kolory: `scripts/render/scene.js` (`key3d`, `vexCage`, `fancyChest`, sekcje `KEYS3D` i `CHESTS`).
