# 🛠️ AKBEN Server-Driven Homepage Nasıl Yönetilir?

Bu altyapı sayesinde uygulamanın anasayfasını (Keşfet ekranını) App Store / Play Store güncellemesi beklemeden, tamamen backend'den yönetebilirsin.

Şu an admin panel arayüzü henüz kodlanmadığı için, bu verileri doğrudan veritabanı veya "Seed" scripti üzerinden yönetiyoruz.

## 1. Verileri Hızlıca Doldurmak (Seed)

Ekranda "Editorial Hero 0 slide" veya "Koleksiyonlar boş" görünmesinin sebebi veritabanındaki kayıtların içi boş olmasıydı. Ben bunu demin düzelttim ve test verilerini ekledim.

Anasayfayı varsayılan (ve resimli/test verili) haline döndürmek için şu komutu çalıştırman yeterlidir:

```bash
cd /Users/akdag/Documents/AkbenRoot/Backend
npx ts-node -r dotenv/config prisma/seed-homepage.ts
```

> **Not:** Uygulamayı yenilediğinde ekrandaki banner ve koleksiyonların dolduğunu göreceksin!

## 2. İçeriği Nasıl Değiştiririm? (Kod Üzerinden)

Şu anki geçici yönetim şeklimiz: **Seed scriptini düzenlemek.**

`Backend/prisma/seed-homepage.ts` dosyasını aç. İçerisinde `SECTIONS` adında bir dizi var.

### Örnek: Banner Değiştirme (Editorial Hero)
`sectionType: 'editorial_hero'` olan objeyi bul. `slides` dizisi içindeki resimleri, başlıkları ve linkleri değiştir.
```typescript
slides: [
  {
    id: 'slide1',
    title: 'Yeni Sezon İnciler', // Burayı değiştir
    subtitle: 'El İşçiliği Özel Setler', // Burayı değiştir
    imageUrl: 'https://cdn.akben.com/inci-banner.jpg', // Resim URL'si
    badge: 'YENİ',
    accent: '#C9963B',
    ctaLabel: 'İncele',
    ctaLink: '/catalog?category=pearls',
  }
]
```

### Örnek: Koleksiyon Ekleme/Çıkarma
`sectionType: 'curated_collections'` olan objeyi bul.
```typescript
collections: [
  {
    id: 'col1',
    name: 'Düğün Setleri',
    imageUrl: '...', // Görsel
    slug: 'wedding-sets', // Katalog filtrelemesi için slug
  }
]
```

Değişikliklerini kaydettikten sonra seed komutunu tekrar çalıştır:
`npx ts-node -r dotenv/config prisma/seed-homepage.ts`
Ve telefonda (veya simülatörde) parmağınla ekranı aşağı çekip yenile. Anında değişecektir!

## 3. İleri Seviye Kullanım: Hedef Kitle ve Öncelik

Her section'ın içinde `priority`, `targetTiers` ve `enabled` alanları vardır.

*   `enabled: false` yaparsan o bölüm ekrandan tamamen kaybolur. (Kampanya bitince gizlemek için)
*   `priority: 95` gibi rakamlarla oynayarak bölümlerin sırasını değiştirebilirsin (yüksek numara daha üstte çıkar).
*   `targetTiers: ['vip_wholesale']` yaparsan, o bölümü SADECE VIP toptancılar görür. Normal kuyumcular göremez.

## 4. Yakında Gelecek Olan Admin Panel Süreci
Yakında `Backend/src/modules/homepage/` içerisine yazdığımız CRUD endpoint'leri, yapacağımız web tabanlı **Akben Admin Panel**'e bağlanacak. O zaman kodlara veya veritabanına dokunmadan; tamamen bir web arayüzünden sürükle-bırak ile anasayfayı yönetebileceksin. 

Şimdilik en hızlı ve güvenli yol `seed-homepage.ts` üzerinden çalışmaktır.
