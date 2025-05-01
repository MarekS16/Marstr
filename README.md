# Webshare Stremio Addon s Real-Debrid podporou

Tento addon umožňuje streamování filmů a seriálů z Webshare.cz s volitelnou podporou Real-Debrid pro rychlejší stahování.

Hlavními principy jsou jednoduchost a nízká údržba. Z tohoto důvodu neobsahuje žádný katalog videí, který by vyžadoval poskytování vysoce kvalitního obsahu. Tento addon funguje přímým vyhledáváním souborů na Webshare.cz. Může to produkovat nepřesné výsledky, ale obvykle rychle najdete správné streamy.

## Co je nového (verze 0.3.0)

- **Přidána podpora Real-Debrid** - možnost využít Real-Debrid službu pro rychlejší a stabilnější streamování
- **Konfigurovatelné nastavení** - možnost zapnout/vypnout použití Real-Debrid
- **Označené Real-Debrid streamy** - streamy používající Real-Debrid jsou označeny ikonou 🚀
- **Optimalizace pro cloudové nasazení** - kompatibilita s Vercel a dalšími cloudovými platformami

## Jak to můžu používat?

### Online verze
Navštivte stránku vašeho nasazeného addonu (např. pokud jste nasadili na Vercel, bude to URL jako https://vas-webshare-addon.vercel.app), zadejte své přihlašovací údaje k Webshare.cz, volitelně API klíč Real-Debrid a nainstalujte addon.

Pro použití Real-Debrid:
1. Získejte API klíč ze svého Real-Debrid účtu v sekci API
2. V konfiguraci addonu zadejte tento API klíč
3. Nastavte "Použít Real-Debrid pro streamování" na "ano"

Tento addon zatím není odeslán do katalogu komunitních addonů, to bude provedeno po určité testovací době.

## Vývoj

Postupujte podle obvyklých kroků:

- nainstalujte závislosti - `npm install`
- vytvořte soubor `config/keys.js` ze šablony `config/keys.js.sample` a vyplňte TMDB API klíč. To není povinné, ale některé funkce mohou vyžadovat, aby byl API klíč přítomen a funkční.
- nainstalujte addon v lokální instanci Stremio - `npm start -- --install`

## Nasazení

Addon můžete nasadit několika způsoby:

### Vercel
- Připravili jsme konfiguraci v souboru `vercel.json`
- Stačí propojit repozitář s Vercelem a nasadit

### Docker
- Použijte připravený `Dockerfile`
- Sestavte a spusťte kontejner:
```
docker build -t webshare-stremio-addon .
docker run -p 7000:7000 webshare-stremio-addon
```

### Heroku
- Použijte připravený `Procfile`
- Nasaďte addon na Heroku:
```
heroku create
git push heroku main
```

Další informace viz [Stremio Addon SDK](https://github.com/Stremio/stremio-addon-sdk).