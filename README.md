# Beton fuvar | KDT-307

Moduláris, offline is használható React alkalmazás böngészőre és Androidra.

## Mi működik?

- A fuvarlista új telepítéskor üres; csak a felhasználó által elmentett fuvarok jelennek meg.
- Fuvar mentése, szerkesztése és törlése.
- A fuvarűrlap pontos km-érték alapján automatikusan kiválasztja és megmutatja az 5 km-es övezetet; a kiszállítási cím is rögzíthető.
- Az állásidő 0–20 darab, 15 perces egységben, telefonon is kényelmes legördülő listából adható meg.
- A mentett adatok helyben maradnak az adott böngészőben vagy telefonon; nincs felhőszinkron.
- A Biztonsági mentés résznél a fuvarok, gyárak, projektek, munkaidő és fejlécek JSON-fájlba menthetők, majd másik eszközre visszaállíthatók.
- Az alkalmazás felső fejlécében a név eszközönként szerkeszthető, így minden kolléga a saját nevét láthatja.
- Az irodai elszámolás fuvaronkénti Excel-fájlt és nyomtatható, PDF-ként menthető kimutatást készít.
- A webes változat telepíthető PWA, és a sikeres első betöltést követően offline is megnyitható.
- Az Android alkalmazás a webes fájlokat az APK-ba csomagolja, ezért internet nélkül is elindul.

Az adatok a böngésző/adat-tárhely törléséig maradnak meg. Az alkalmazás eltávolítása vagy az app adatainak törlése előtt készíts exportot, ha arra szükség van. A telefon és a számítógép adatai külön tárolódnak.

## Fejlesztői indítás

```powershell
npm install
npm run dev
```

## Automatikus tesztek

```powershell
npm test
```

A tesztek lefedik az övezeti díjhatárokat, minimum m³ szerinti kalkulációt, valamint a biztonsági mentés exportját, ellenőrzését, visszaállítását és sikertelen írás utáni visszagörgetését.

## Moduláris módosítás

- **Gyárak, projektek, díjak:** `src/config/app.config.json`
- **Fuvarűrlap:** `src/features/fuvar/FuvarForm.tsx`
- **Gyárak csempéje, felvitele és szerkesztése:** `src/features/gyar/Gyarkezelo.tsx`
- **Munkaidő funkció:** `src/features/munkaido/Munkaido.tsx`
- **Árkalkuláció:** `src/core/domain/szamitas.ts`
- **Eszközön tárolás:** `src/core/data/storage.ts`
- **Alkalmazás összefogása:** `src/app/App.tsx`
- **Megjelenés:** `src/styles.css`, `src/ui/theme/`

A gyárkezelő csempe összecsukható. Benne új gyár adható hozzá, és a gyár neve, az alap fuvarár (0–5 km), egyetlen övezeti lépés, a gyár saját minimum számlázott mennyisége, valamint a 15 percenkénti állásdíj szerkeszthető. Ha a megadott betonmennyiség a gyár minimuma alatt van, az ár a minimum m³ alapján számolódik. A 700 Ft/m³-es lépés például 5–10 km-nél 700, 10–15 km-nél 1 400, 15–20 km-nél 2 100 Ft/m³ növekményt ad az alaphoz. A kiválasztott övezet díja szorzódik a számlázott m³-rel; az állásdíj a gyár beállítása szerinti 15 perces egységenként adódik hozzá.

A gyárkezelőn belüli projektkezelővel projektnevek és rögzített Ft/m³ díjak adhatók hozzá, szerkeszthetők vagy törölhetők. Fix díjas projekt kiválasztásakor ez váltja ki a gyár alap- és övezeti árát; a fuvar fix díja és a gyár állásdíja továbbra is érvényes. A régi, díj nélküli alap projektek addig a gyár árazását használják, amíg fix projektárat nem állítasz be. A gyár- és projektlisták ezen az eszközön maradnak meg (`gyarak_v70`, `projektek_v70`); a korábbi gyáradatok hiányzó állásdíja az alapértelmezett 2 000 Ft/15 perc értéket kapja. A korábban mentett fuvarok adatai változatlanul megmaradnak.

Az alap gyárak induló minimuma 4 m³; a minimum mennyiség gyáranként módosítható. A további induló díjak a korábbi projektértékeket őrzik: 2 000 Ft/15 perc állásdíj és 45 000 Ft fix díj. Az övezeti díjakat és a minimum mennyiséget a gyárkezelő csempében lehet beállítani.

A munkaidő-számoló Fuvarozás és Műhely módban is menti a napi érkezést és távozást. Egy naphoz egy jelenléti bejegyzés tartozik; az adott nap újbóli mentése frissíti a bejegyzést. A Műhely mód órabér alapján számol, és az összeg külön műhelybevételként jelenik meg. A jelenléti ív a csatolt mintához hasonló, 32 soros havi lapként nyomtatható; a munkáltató és dolgozó neve eszközönként megadható. Szünetlevonás nincs. A korábbi, csak műhelydíjként mentett bejegyzések megmaradnak, és jelenléti sorba kerülnek.

Az alkalmazás felső fejlécének nevét a **Szerkesztés** gombbal lehet módosítani. A név az adott böngészőben vagy telefonon tárolódik (`app_fejlec_v70`), ezért a kollégának a saját eszközén kell megadnia; ez nem írja át az alkalmazás alapértelmezését és nem módosítja a jelenléti ív fejlécét.

## Biztonsági mentés és adatátvitel

Az alkalmazás alján, a **Biztonsági mentés** résznél a **Mentés megosztása / letöltése** gomb exportálja a fuvarokat, gyárakat, projekteket, jelenléti bejegyzéseket és fejléceket egy JSON-fájlba. Telefonon megnyitja az Android megosztási ablakát; böngészőben és Windows alkalmazásban letölti a fájlt. Küldd át például Drive-on, e-mailben vagy más fájlmegosztóval. A másik eszközön válaszd a **Mentés betöltése** gombot, majd tallózd be a fájlt.

Az import ellenőrzi a fájl formátumát, és a visszaállítás előtt megerősítést kér. A visszaállítás lecseréli az eszközön lévő jelenlegi adatokat. A mentés érzékeny fuvar- és munkaidő-információkat tartalmaz; csak biztonságos csatornán és megbízható címzettnek küldd el. A mentés verziózott formátumú (`beton-fuvar-mentes`, 1-es verzió).

Az **Irodai elszámolás** résznél hónap vagy az összes fuvar választható. Az Excel-fájl a fuvaradatokat külön sorokban, az összesítést külön munkalapon tartalmazza. A PDF gomb megnyitja a nyomtatási ablakot; ott válaszd a **Mentés PDF-ként** lehetőséget. Ezek elszámolási segédletek, nem adóügyi számlák: a hivatalos számlát a cég számlázóprogramjában kell kiállítani.

## Telepíthető offline webapp

```powershell
npm run build
npm run preview
```

A preview címe rendszerint `http://localhost:4173`. Ezt Chrome/Edge alatt megnyitva az alkalmazás telepíthető. A PWA telepítéséhez és service workeréhez HTTPS vagy localhost szükséges. Első megnyitáskor legyen internetkapcsolat; utána az alkalmazás helyi gyorsítótárból offline is betölthető.

## Windows telepítő (.exe) készítése

Node.js/npm szükséges. PowerShellben a projekt gyökerében futtasd:

```powershell
npm install
npm run desktop:exe
```

A telepítő a `release` mappába kerül `Beton fuvar-Setup-70.0.0.exe` néven. Telepítés után a Windows Start menüjéből vagy az asztali parancsikonról indítható, internet nélkül is. A program adatai a Windows felhasználói profiljához tartozó helyi alkalmazástárban maradnak.

## Android APK készítése

Előfeltétel: Android Studio telepítve, az Android SDK-val és a szükséges SDK platform/build-tools csomagokkal; Java 17 is szükséges.

PowerShellben, a projekt gyökerében:

```powershell
npm run android:apk
```

Az APK helye:

`android\app\build\outputs\apk\debug\app-debug.apk`

Az Android-projekt Capacitorral van létrehozva. Ha a webes forrásokat kézzel másolnád, előbb futtasd a `npm run build` és `npx cap sync android` parancsokat.

## Fontos

- A webes és Androidos mentések **nem** szinkronizálódnak egymással.
- A `fuvarok_v70` és korábbi `fuvarok` tárhelykulcsokat a migráció nem törli. Ismeretlen vagy hibás tárolt formátum esetén az app hibát jelez, és nem írja felül a mentést.
- A gyár- és díjkonfiguráció az alkalmazás verziójába épül. Módosítása után új web build vagy új APK telepítése szükséges.
