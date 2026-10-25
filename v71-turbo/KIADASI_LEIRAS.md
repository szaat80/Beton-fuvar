# Beton fuvar (KDT-307) – kiadási leírás

**Verzió:** 71.0.5
**Csomagazonosító:** `hu.szaboattila.kdt307`
**Kiadási állapot:** tesztelésre és belső terjesztésre előkészítve. Az Android debug APK nem Play Áruházba szánt, aláírt kiadás.

## Rövid leírás

Betonfuvarok, projektek és munkaidő rögzítése sofőröknek, offline használattal, Excel-elszámolással és opcionális, saját Supabase-projektet használó szinkronnal.

## Részletes leírás

A Beton fuvar mobilon és asztali gépen használható fuvarnyilvántartó. Rögzíti a fuvar adatait, a gyárat és annak projektjeit, a távolságot, a betonmennyiséget, az állásidőt, valamint a fuvar összegét. Gyáranként külön kezelhetők a projektek és díjbeállítások. A munkaidő funkció a fuvarozási és műhelymunkát külön tartja nyilván. A felhasználó Excel-elszámolást készíthet, adatmentést exportálhat, és megfelelő beállítás esetén más eszközökkel is szinkronizálhat.

## Főbb funkciók

- Fuvarok létrehozása, szerkesztése, törlése és áttekintése.
- Gyárankénti projektlista, projektdíj, övezeti ár és minimum számlázott mennyiség.
- Munkaidő- és műhelybejegyzések rögzítése; külön elszámolható műhelyösszeg.
- Fuvarok Excel-exportja és nyomtatható kimutatása.
- Helyi adatmentés JSON-fájlba, illetve ellenőrzött visszaállítás másik eszközön.
- Opcionális eszközök közötti adat-egyesítés saját Supabase-projekten keresztül.
- Offline használat a már telepített alkalmazásban.

## Platformok és telepítés

- **Android:** a kiadási folyamat jelenleg debug APK-t készít. Telepítés előtt ellenőrizd, hogy az eszköz engedélyezi-e az adott forrásból származó alkalmazások telepítését. Ez a fájl nem Play Áruházba feltölthető, aláírt release csomag.
- **Windows:** az alkalmazás Electron-alapú NSIS telepítőt készít a `release` mappába.
- **Web:** a Vite build PWA-ként telepíthető; az első sikeres betöltés után offline is megnyitható.

Az Android buildhez Android SDK és Java 17, a Windows buildhez Node.js/npm szükséges. A végfelhasználóknak a telepített APK/EXE futtatásához nem kell fejlesztői környezet.

## Első használat és adatkezelés

Az alkalmazás internet nélkül is ment a készülék helyi tárhelyére. A helyi adatok eszközönként különállók; az alkalmazás törlése vagy az alkalmazásadatok ürítése előtt készíts JSON-biztonsági mentést, ha az adatokra később szükség lesz.

A felhőszinkron opcionális. Használatához a szervezet saját Supabase-projektje, annak adatbázissémája és felhasználói bejelentkezése szükséges. A hálózati szinkron személyes és üzleti adatokat továbbíthat a beállított Supabase-projektbe. A kiadást végző szervezet feladata a hozzáférések, adatmegőrzés, adatvédelmi tájékoztató és adatkezelési jogalap megfelelő beállítása.

A JSON-mentések fuvar-, projekt- és munkaidő-adatokat tartalmazhatnak. Csak jogosult személynek, biztonságos csatornán továbbítsd őket.

## Üzemeltetési és kiadási megjegyzések

- A 71.0.5-ös verzió a 71.0.4-es verzió után következik; az Android verziókódját a build a csomagverzióból állítja elő.
- A felhő használata előtt telepítsd a projekt `supabase/schema.sql` adatbázissémáját, és alkalmazásonként állítsd be a megfelelő Supabase URL-t és publikus kulcsot.
- Kliensalkalmazásba soha ne kerüljön Supabase `service_role` titkos kulcs.
- Nyilvános Android-kiadáshoz készíts külön aláírt release APK-t vagy AAB-t, ellenőrizd a Play Console adatbiztonsági és adatvédelmi követelményeit, és végezd el a célzott eszköztesztet. A debug APK önmagában nem teljesíti ezeket a lépéseket.
- Windows széles körű terjesztése előtt teszteld az EXE-t támogatott Windows-verziókon; a digitális aláírás és a SmartScreen-megjelenés külön kiadási feladat.

## Kiadás előtti ellenőrzőlista

1. Teljes tesztcsomag, TypeScript-ellenőrzés és produkciós build sikeres.
2. `npm audit` eredményét ellenőrizd; a build eszközök függőségei is részei a fejlesztési/kiadási környezetnek.
3. Androidon ellenőrizd a telepítést, az offline indulást, a mentést és a visszaállítást.
4. Windows alatt ellenőrizd a telepítést, az értesítést, az adatmegőrzést és az eltávolítást.
5. Készíts új biztonsági mentést, mielőtt meglévő eszközön frissítesz.
