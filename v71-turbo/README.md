# Beton fuvar | KDT-307

Moduláris, offline is használható React alkalmazás böngészőre és Androidra.

## Mi működik?

- A fuvarlista új telepítéskor üres; csak a felhasználó által elmentett fuvarok jelennek meg.
- Fuvar mentése, szerkesztése és törlése.
- A fuvarűrlap pontos km-érték alapján automatikusan kiválasztja és megmutatja az 5 km-es övezetet; a kiszállítási cím is rögzíthető.
- A projektek gyáranként kezelhetők; fuvarrögzítéskor csak a kiválasztott gyárhoz rendelt projektek választhatók.
- Az állásidő 0–20 darab, 15 perces egységben, telefonon is kényelmes legördülő listából adható meg.
- A mentett adatok helyben megmaradnak, és azonos Supabase-projektbe bejelentkezve az eszközök között is szinkronizálódnak.
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

A gyárkezelőn belüli projektkezelő gyáranként csoportosítja a projekteket; új projektet egy kiválasztott gyárhoz lehet hozzáadni, a korábbi, közös listás projekteket pedig a „Gyárhoz nem rendelt régi projektek” csoportban lehet a megfelelő gyárhoz rendelni. Fuvarrögzítéskor csak az éppen kiválasztott gyárhoz tartozó projektek jelennek meg. Projektnevek és rögzített Ft/m³ díjak adhatók hozzá, szerkeszthetők vagy törölhetők. Fix díjas projekt kiválasztásakor ez váltja ki a gyár alap- és övezeti árát; a fuvar fix díja és a gyár állásdíja továbbra is érvényes. A díj nélküli projekt a gyár árazását használja. A gyár- és projektlisták ezen az eszközön maradnak meg (`gyarak_v70`, `projektek_v70`); a korábbi gyáradatok hiányzó állásdíja az alapértelmezett 2 000 Ft/15 perc értéket kapja. A korábban mentett fuvarok adatai változatlanul megmaradnak.

Az alap gyárak induló minimuma 4 m³; a minimum mennyiség gyáranként módosítható. A további induló díjak a korábbi projektértékeket őrzik: 2 000 Ft/15 perc állásdíj és 45 000 Ft fix díj. Az övezeti díjakat és a minimum mennyiséget a gyárkezelő csempében lehet beállítani.

A munkaidő-számoló Fuvarozás és Műhely módban is menti a napi érkezést és távozást. Egy naphoz egy jelenléti bejegyzés tartozik; az adott nap újbóli mentése frissíti a bejegyzést. A Műhely mód órabér alapján számol, és az összeg külön műhelybevételként jelenik meg. A jelenléti ív a csatolt mintához hasonló, 32 soros havi lapként nyomtatható; a munkáltató és dolgozó neve eszközönként megadható. Szünetlevonás nincs. A korábbi, csak műhelydíjként mentett bejegyzések megmaradnak, és jelenléti sorba kerülnek.

Az alkalmazás felső fejlécének nevét a **Szerkesztés** gombbal lehet módosítani. A név az adott böngészőben vagy telefonon tárolódik (`app_fejlec_v70`), ezért a kollégának a saját eszközén kell megadnia; ez nem írja át az alkalmazás alapértelmezését és nem módosítja a jelenléti ív fejlécét.

## Biztonsági mentés és adatátvitel

Az alkalmazás alján, a **Biztonsági mentés** résznél a **Mentés megosztása / letöltése** gomb exportálja a fuvarokat, gyárakat, projekteket, jelenléti bejegyzéseket és fejléceket egy JSON-fájlba. A fájlnév tartalmazza a felső fejlécben szereplő dolgozó nevét és – ha meg van adva – a rendszámot is, a mentés pedig ezeket külön mezőként is tárolja. Telefonon megnyitja az Android megosztási ablakát; böngészőben és Windows alkalmazásban letölti a fájlt. A másik eszközön válaszd a **Mentés betöltése** gombot, majd tallózd be a fájlt.

Az import ellenőrzi a fájl formátumát, és a visszaállítás előtt megerősítést kér. A visszaállítás lecseréli az eszközön lévő jelenlegi adatokat. A `beton-fuvar-mentes` JSON közvetlenül beolvasható az Irodai Központ **Sofőr JSON-fájlok beolvasása** funkciójával is; az irodai táblázat a dolgozó nevét, rendszámát, a fuvar adatait és a teljes összeget használja. A mentés érzékeny fuvar- és munkaidő-információkat tartalmaz; csak biztonságos csatornán és megbízható címzettnek küldd el. A mentés verziózott formátumú (`beton-fuvar-mentes`, 1-es verzió).

Az **Irodai elszámolás** résznél alapértelmezetten az összes fuvar kerül az Excelbe, de hónap is választható. Az Excel-fájl a fuvaradatokat külön sorokban, valódi dátum- és számértékekkel, szűrhető táblázatként, az összesítést pedig külön munkalapon tartalmazza. A PDF gomb megnyitja a nyomtatási ablakot; ott válaszd a **Mentés PDF-ként** lehetőséget. Ezek elszámolási segédletek, nem adóügyi számlák: a hivatalos számlát a cég számlázóprogramjában kell kiállítani.

## Saját Supabase-projekt és eszközök közötti szinkron

A **Felhőszinkron · saját Supabase-adatbázis** résznél minden felhasználó a saját Supabase-projektjét és saját e-mailes fiókját használhatja. A web-, Android- és Windows-asztali app helyben továbbra is ment, internetkapcsolat esetén bejelentkezéskor, megnyitáskor, hálózat-visszatéréskor és 30 másodpercenként ellenőrzi a felhőt. A **Kényszerített szinkron** gomb azonnal ellenőrzi az adatokat. A külön eszközön létrehozott fuvarokat és bejegyzéseket automatikusan összevonja; ugyanazon rekord eltérő módosításánál választást kér, és nem ír felül csendben. Első összekapcsoláskor is egyesíti a két oldalon külön létrehozott rekordokat; csak az ütköző értékekről kér döntést, nem cseréli le az egyik teljes mentést a másikra.

A szinkron a nyitva futó alkalmazások között internetkapcsolattal működik, nem garantál azonnali frissülést háttérbe tett vagy bezárt appnál. Az irodai alkalmazás a sofőr fuvar-, kiállás- és munkaidőadatait átveszi, valamint az irodai törléseket továbbítja; nem teszi közössé a helyi HR-, flotta- és üzemanyag-nyilvántartást. Az irodai árlista/projekt/kiállási útvonal külön közzétételi felületen jut el a v71-re.

1. Hozz létre saját Supabase-projektet, és engedélyezd az e-mail/jelszó bejelentkezést az Authentication beállításainál. Az Authentication URL Configuration beállításában add meg az alkalmazás HTTPS-címét az engedélyezett Redirect URLs között; helyi fejlesztéshez add hozzá a `http://127.0.0.1:5173/**` címet is.
2. A projekt SQL Editor felületén futtasd a `supabase/schema.sql` tartalmát. Ez létrehozza a JSON biztonsági mentést tároló táblát és a Row Level Security szabályokat; minden bejelentkezett felhasználó csak a saját sorát olvashatja és írhatja.
3. A 71.0.6-os, ehhez a projekthez előre beállított telepítőben a projekt URL és publikus `publishable` kulcs automatikusan megjelenik. Másik Supabase-projekt használatához írd át ezeket az appban; majd jelentkezz be vagy hozz létre fiókot. Az app a projektbeállításokat eszközönként tárolja, jelszót nem tárol; a Supabase kliens kezeli a bejelentkezési munkamenetet.
4. Első csatlakozáskor az app megőrzi és összevonja a helyi és a felhőben lévő külön rekordokat. Ha ugyanaz a rekord mindkét oldalon eltérően változott, kiválaszthatod, hogy az adott ütközésnél a helyi vagy a felhőbeli érték maradjon meg; a többi, nem ütköző változás megmarad. Később is ugyanez a szabály érvényesül. A külön, kézzel indított teljes visszaállítás megerősítést kér, mert lecseréli az eszköz helyi adatait.

Csak a Supabase URL-t és a publikus klienskulcsot add meg. **A `service_role` vagy más titkos kulcs nem kerülhet böngészőbe vagy mobilappba.** A biztonságot az adatbázisban bekapcsolt RLS adja, ezért ne távolítsd el és ne módosítsd a mellékelt saját-felhasználós szabályokat. Más alkalmazás a `app_sync_data` táblához a Supabase hitelesített REST API-ján csatlakozhat, ugyanazzal a felhasználói bejelentkezéssel és RLS-korlátozással; a `backup` mező a verziózott `beton-fuvar-mentes` JSON-formátum.

Az automatikus szinkron csak akkor működik, ha az app fut; bezárt appnál háttérfrissítés nincs garantálva, de újraindításkor az app rögtön ellenőrzi a felhőt. A Windows-asztali változat új adatnál hangjelzést és rendszerértesítést ad; a telefonos és böngészős változat az appon belül jelez. A Supabase-projekt létrehozása és a SQL futtatása szükséges az első éles kapcsolathoz. A helyi fejlesztői `127.0.0.1` cím továbbra sem teszi interneten elérhetővé az alkalmazást.

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

A telepítő a `release` mappába kerül `Beton fuvar Setup 71.0.6.exe` néven. Telepítés után a Windows Start menüjéből vagy az asztali parancsikonról indítható, internet nélkül is. A program adatai a Windows felhasználói profiljához tartozó helyi alkalmazástárban maradnak.

## Android APK készítése

Előfeltétel: Android Studio telepítve, az Android SDK-val és a szükséges SDK platform/build-tools csomagokkal; Java 17 is szükséges.

PowerShellben, a projekt gyökerében:

```powershell
npm run android:apk
```

Az APK helye:

`android\app\build\outputs\apk\debug\app-debug.apk`

Az Android-projekt Capacitorral van létrehozva. Az `npm run cap:sync` parancs alkalmazza a Capacitor 6 és a javított `tar` csomag CommonJS-importja közti kompatibilitási korrekciót, majd frissíti az Android pluginfájlokat. A `npm run android:apk` ugyanezt a lépést használja az APK készítésekor. Csak webes forrásmásoláshoz a `npm run cap:copy` használható.

## Frissítés Androidon és Windowson

- **Android:** az új APK-t másold át a telefonra, majd nyisd meg és erősítsd meg a frissítést. Ne távolítsd el előtte az alkalmazást. A telefon az adatokat megtartja, ha az alkalmazásazonosító és az aláírókulcs változatlan; ezért az APK-kat ugyanazon a fejlesztői gépen, ugyanazzal a Windows-felhasználói fiókkal kell készíteni, és a `%USERPROFILE%\.android\debug.keystore` fájlt nem szabad törölni.
- **Windows:** zárd be a programot, majd indítsd el az új `release\Beton fuvar Setup 71.0.6.exe` telepítőt, és telepítsd a meglévő helyére. Nem kell előtte eltávolítani; a Windows-felhasználó helyi adatai megmaradnak.

Új kiadás előtt a `package.json` verziószámát növelni kell (például `71.0.6`-ról `71.0.7`-re). Az Android `versionCode` automatikusan ebből készül, hogy a telefon az új APK-t frissítésként ismerje fel. Androidon a telepítés jóváhagyását a rendszer biztonsági okból mindig kéri; a frissítő APK nem tudja ezt felhasználói megerősítés nélkül megkerülni.

## Fontos

- A webes, Androidos és Windows-asztali mentések csak azonos Supabase-projektbe beállítva és ugyanazzal a fiókkal szinkronizálódnak; a helyi mentés ettől függetlenül minden eszközön megmarad.
- A `fuvarok_v70` és korábbi `fuvarok` tárhelykulcsokat a migráció nem törli. Ismeretlen vagy hibás tárolt formátum esetén az app hibát jelez, és nem írja felül a mentést.
- A gyár- és díjkonfiguráció az alkalmazás verziójába épül. Módosítása után új web build vagy új APK telepítése szükséges.
