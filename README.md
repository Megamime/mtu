# Megami

Manga ve fansub takip kütüphanesi (PWA). Sunucu yok, dış API yok — veriler cihazda tutulur.

## Dosyalar
- `index.html` — açılış ekranı; cihaza göre `mobile.html` / `desktop.html`'e yönlendirir
- `mobile.html` — mobil arayüz (şu an geliştirilen sürüm)
- `desktop.html` — masaüstü arayüzü (şimdilik donduruldu)
- `app.js` — ortak mantık (veri, render, yedekleme, istatistik…)
- `sw.js` — service worker (çevrimdışı çalışma, önbellek)

## Veri
- Seriler ve aktivite günlüğü: IndexedDB (`MegamiDB`: `series`, `activityLog`)
- Ayarlar, profil, çeviri ekibi logo/linkleri: localStorage
- Yedek dosyası (`megami-yedek-TARİH.json`, v3): seriler + aktivite günlüğü + ayarlar. Eski (v2 / düz dizi) yedekler de açılır.

## Geliştirme notları
- Kayıt artımlıdır: `save()` yalnızca değişen serileri yazar.
- Kapaklar base64 saklanır; ekranda `coverSrc()` ile Blob URL'ye çevrilerek gösterilir (HTML küçük kalır).
- Inline `onclick` içine kullanıcı verisi koyarken `jsArg()`, dış bağlantılar için `safeUrl()` / `openExternal()` kullan.
- İçe aktarılan her dosya `sanitizeSeriesRecord()` / `validateSeriesShape()` ile temizlenir.
- `sw.js` değişince `CACHE_NAME` sürümünü artır.
