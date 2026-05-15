# Story API — Endpoint Dokümantasyonu

---

## Genel Bilgiler

**Base URL:** `https://api.example.com/v1`  
**Auth:** Bearer token (Authorization header)  
**Format:** JSON  
**Tarih formatı:** ISO 8601 (`2026-04-28T09:00:00Z`)

---

## Modeller

### StoryGroup


| Alan      | Tip     | Açıklama                              |
| --------- | ------- | ------------------------------------- |
| id        | string  | Grubun benzersiz ID'si                |
| name      | string  | Görünen isim (örn: "Yeni Sezon")      |
| avatarUrl | string  | Story ikon görseli                    |
| type      | enum    | `brand` / `user`                      |
| priority  | number  | Öncelik — yüksek olan önce gösterilir |
| isSeen    | boolean | Gruptaki tüm story'ler görüldü mü     |
| stories   | Story[] | Story listesi                         |


### Story


| Alan                  | Tip           | Açıklama                                                        |
| --------------------- | ------------- | --------------------------------------------------------------- |
| id                    | string        | Story'nin benzersiz ID'si                                       |
| mediaUrl              | string        | Image için optimize asset URL'i, video için HLS manifest URL'i  |
| thumbnailUrl          | string        | Önizleme görseli URL'i                                          |
| posterUrl             | string | null | Video için kapak görseli — `mediaType: video` olduğunda zorunlu |
| mediaType             | enum          | `image` / `video`                                               |
| optimizedFormat       | string | null | `webp`, `avif` veya `hls`                                       |
| hlsManifestUrl        | string | null | Video için ana HLS manifest URL'i                               |
| hlsPreviewSegmentUrls | string[]      | Zero-buffer cache için ilk segment URL'leri                     |
| mediaBytes            | number | null | Optimize edilmiş asset toplam boyutu                            |
| mediaWidth            | number | null | Kaynak genişlik                                                 |
| mediaHeight           | number | null | Kaynak yükseklik                                                |
| durationMs            | number        | Gösterim süresi (ms)                                            |
| order                 | number        | Grup içindeki sıra                                              |
| createdAt             | string        | Yayınlanma zamanı                                               |
| expiresAt             | string        | Bitiş zamanı                                                    |
| isSeen                | boolean       | Kullanıcı bu story'i gördü mü                                   |
| seenAt                | string | null | Görülme zamanı                                                  |
| cta                   | CTA | null    | Call-to-action bilgisi                                          |


### CTA


| Alan  | Tip    | Açıklama                                                                                     |
| ----- | ------ | -------------------------------------------------------------------------------------------- |
| type  | enum   | `product` / `collection` / `link` / `design`                                                 |
| value | string | `product` → product ID, `collection` → collection ID, `link` → tam URL, `design` → design ID |
| label | string | Buton yazısı (örn: "Ürünü İncele")                                                           |


### StoryView


| Alan         | Tip           | Açıklama                                             |
| ------------ | ------------- | ---------------------------------------------------- |
| storyId      | string        | Görüntülenen story ID'si                             |
| seenAt       | string        | Görülme zamanı                                       |
| completed    | boolean       | `durationMs` sonuna kadar izlendi mi                 |
| ctaClicked   | boolean       | CTA butonuna tıklandı mı                             |
| ctaClickedAt | string | null | CTA tıklanma zamanı — `ctaClicked: false` ise `null` |
| platform     | enum          | `ios` / `android` / `web`                            |


### Meta (Sayfalama)


| Alan       | Tip           | Açıklama                                         |
| ---------- | ------------- | ------------------------------------------------ |
| total      | number        | Toplam grup sayısı                               |
| limit      | number        | Sayfa başına öğe                                 |
| nextCursor | string | null | Sonraki sayfa için cursor — `null` ise son sayfa |


### Hata


| Alan          | Tip     | Açıklama                    |
| ------------- | ------- | --------------------------- |
| success       | boolean | `false`                     |
| error.code    | string  | Makine-okunabilir hata kodu |
| error.message | string  | İnsan-okunabilir açıklama   |


---

## Endpointler

---

### 1. Story gruplarını listele

```
GET /story-groups
```

Kullanıcının görebileceği aktif story gruplarını döner. `priority` değerine göre sıralı gelir. Süresi dolmuş (`expiresAt` geçmiş) story'ler filtrelenmiş olarak döner.

**Query Parametreleri**


| Parametre | Tip    | Zorunlu | Açıklama                                               |
| --------- | ------ | ------- | ------------------------------------------------------ |
| limit     | number | Hayır   | Sayfa başına grup sayısı — varsayılan: `10`, max: `50` |
| cursor    | string | Hayır   | Sayfalama için cursor — ilk istekte boş bırakılır      |


**Başarılı Yanıt — `200 OK`**

```json
{
  "success": true,
  "meta": {
    "total": 24,
    "limit": 10,
    "nextCursor": "eyJpZCI6InN0b3J5X2dyb3VwXzExIn0"
  },
  "data": [
    {
      "id": "story_group_1",
      "name": "Yeni Sezon",
      "avatarUrl": "https://cdn.example.com/avatars/new-season.png",
      "type": "brand",
      "priority": 10,
      "isSeen": false,
      "stories": [
        {
          "id": "story_1",
          "mediaUrl": "https://cdn.example.com/stories/story-1.jpg",
          "thumbnailUrl": "https://cdn.example.com/stories/story-1-thumb.jpg",
          "posterUrl": null,
          "mediaType": "image",
          "durationMs": 5000,
          "order": 1,
          "createdAt": "2026-04-28T09:00:00Z",
          "expiresAt": "2026-04-29T09:00:00Z",
          "isSeen": false,
          "seenAt": null,
          "cta": {
            "type": "product",
            "value": "product_123",
            "label": "Ürünü İncele"
          }
        }
      ]
    }
  ]
}
```

**Hata Yanıtları**


| Kod | error.code       | Açıklama                  |
| --- | ---------------- | ------------------------- |
| 401 | `unauthorized`   | Geçersiz veya eksik token |
| 422 | `invalid_cursor` | Geçersiz cursor değeri    |
| 500 | `internal_error` | Sunucu hatası             |


---

### 2. Tek story grubunu getir

```
GET /story-groups/:groupId
```

Belirli bir grubun tüm story'leriyle birlikte detayını döner.

**Path Parametreleri**


| Parametre | Tip    | Açıklama             |
| --------- | ------ | -------------------- |
| groupId   | string | Story grubunun ID'si |


**Başarılı Yanıt — `200 OK`**

```json
{
  "success": true,
  "data": {
    "id": "story_group_1",
    "name": "Yeni Sezon",
    "avatarUrl": "https://cdn.example.com/avatars/new-season.png",
    "type": "brand",
    "priority": 10,
    "isSeen": false,
    "stories": [
      {
        "id": "story_1",
        "mediaUrl": "https://cdn.example.com/stories/story-1.mp4",
        "thumbnailUrl": "https://cdn.example.com/stories/story-1-thumb.jpg",
        "posterUrl": "https://cdn.example.com/stories/story-1-poster.jpg",
        "mediaType": "video",
        "durationMs": 15000,
        "order": 1,
        "createdAt": "2026-04-28T09:00:00Z",
        "expiresAt": "2026-04-29T09:00:00Z",
        "isSeen": true,
        "seenAt": "2026-04-28T11:32:00Z",
        "cta": {
          "type": "link",
          "value": "https://example.com/kampanya",
          "label": "Kampanyayı Gör"
        }
      }
    ]
  }
}
```

**Hata Yanıtları**


| Kod | error.code              | Açıklama                  |
| --- | ----------------------- | ------------------------- |
| 401 | `unauthorized`          | Geçersiz veya eksik token |
| 404 | `story_group_not_found` | Grup bulunamadı           |
| 500 | `internal_error`        | Sunucu hatası             |


---

### 3. Storyi görüldü olarak işaretle

```
PATCH /stories/:storyId/seen
```

Tek bir story'i görüldü olarak işaretler. Hızlı güncelleme senaryoları için kullanılır.

**Path Parametreleri**


| Parametre | Tip    | Açıklama        |
| --------- | ------ | --------------- |
| storyId   | string | Story'nin ID'si |


**Request Body**

```json
{
  "seenAt": "2026-04-28T11:32:00Z",
  "completed": true,
  "ctaClicked": false,
  "ctaClickedAt": null,
  "platform": "android"
}
```


| Alan         | Tip           | Zorunlu | Açıklama                                             |
| ------------ | ------------- | ------- | ---------------------------------------------------- |
| seenAt       | string        | Evet    | Görülme zamanı — ISO 8601                            |
| completed    | boolean       | Evet    | `durationMs` sonuna kadar izlendi mi                 |
| ctaClicked   | boolean       | Evet    | CTA butonuna tıklandı mı                             |
| ctaClickedAt | string | null | Evet    | CTA tıklanma zamanı — `ctaClicked: false` ise `null` |
| platform     | enum          | Evet    | `ios` / `android` / `web`                            |


**Başarılı Yanıt — `200 OK`**

```json
{
  "success": true,
  "data": {
    "storyId": "story_1",
    "isSeen": true,
    "seenAt": "2026-04-28T11:32:00Z",
    "completed": true,
    "ctaClicked": false,
    "ctaClickedAt": null
  }
}
```

**Hata Yanıtları**


| Kod | error.code         | Açıklama                      |
| --- | ------------------ | ----------------------------- |
| 401 | `unauthorized`     | Geçersiz veya eksik token     |
| 404 | `story_not_found`  | Story bulunamadı              |
| 422 | `validation_error` | Eksik alan veya format hatası |
| 500 | `internal_error`   | Sunucu hatası                 |


---

### 4. Toplu görüntülenme kaydı

```
POST /story-views/batch
```

Birden fazla story'i tek istekte görüldü olarak işaretler. Pazarlama verisi (`completed`, `ctaClicked`) da bu endpoint üzerinden toplanır. Client, görüntüleme event'larını kuyruğa alıp bu endpoint ile toplu göndermelidir (önerilen: 5 saniyede bir veya 10 event dolunca).

**Request Body**

```json
{
  "views": [
    {
      "storyId": "story_1",
      "seenAt": "2026-04-28T11:32:00Z",
      "completed": true,
      "ctaClicked": true,
      "ctaClickedAt": "2026-04-28T11:32:04Z",
      "platform": "ios"
    },
    {
      "storyId": "story_2",
      "seenAt": "2026-04-28T11:32:05Z",
      "completed": false,
      "ctaClicked": false,
      "ctaClickedAt": null,
      "platform": "ios"
    }
  ]
}
```


| Alan                 | Tip           | Zorunlu | Açıklama                                             |
| -------------------- | ------------- | ------- | ---------------------------------------------------- |
| views                | StoryView[]   | Evet    | Görüntüleme listesi — max 50 öğe                     |
| views[].storyId      | string        | Evet    | Story ID'si                                          |
| views[].seenAt       | string        | Evet    | Görülme zamanı — ISO 8601                            |
| views[].completed    | boolean       | Evet    | `durationMs` sonuna kadar izlendi mi                 |
| views[].ctaClicked   | boolean       | Evet    | CTA butonuna tıklandı mı                             |
| views[].ctaClickedAt | string | null | Evet    | CTA tıklanma zamanı — `ctaClicked: false` ise `null` |
| views[].platform     | enum          | Evet    | `ios` / `android` / `web`                            |


**Başarılı Yanıt — `200 OK`**

```json
{
  "success": true,
  "data": {
    "processed": 2,
    "skipped": 0
  }
}
```


| Alan      | Açıklama                                        |
| --------- | ----------------------------------------------- |
| processed | Başarıyla işlenen kayıt sayısı                  |
| skipped   | Zaten görülmüş olduğu için atlanan kayıt sayısı |


**Hata Yanıtları**


| Kod | error.code             | Açıklama                      |
| --- | ---------------------- | ----------------------------- |
| 401 | `unauthorized`         | Geçersiz veya eksik token     |
| 422 | `validation_error`     | Eksik alan veya format hatası |
| 422 | `batch_limit_exceeded` | 50 öğe limiti aşıldı          |
| 500 | `internal_error`       | Sunucu hatası                 |


---

### 5. Optimize story upload

```
POST /admin/story-groups/:groupId/stories
```

Bu endpoint raw binary upload kabul eder ve medyayı yayınlanmadan önce optimize eder.

- Image upload'lar `webp` veya `avif` çıktısına çevrilir.
- Video upload'lar adaptive bitrate HLS VOD (`master.m3u8`) çıktısına çevrilir.
- Raw `.mp4` / `.mov` publish edilmez.
- Video süresi 60 saniyeyi aşarsa `overflowPolicy=reject|trim` uygulanır.

**Query Parametreleri**

| Parametre | Tip | Zorunlu | Açıklama |
| --- | --- | --- | --- |
| `mediaType` | enum | Evet | `image` / `video` |
| `order` | number | Evet | Grup içi sıra |
| `expiresAt` | string | Evet | ISO 8601 |
| `durationMs` | number | Hayır | Image story gösterim süresi |
| `overflowPolicy` | enum | Hayır | `reject` / `trim` |
| `imageFormat` | enum | Hayır | `webp` / `avif` |
| `ctaType` | enum | Hayır | `product` / `collection` / `link` / `design` |
| `ctaValue` | string | Hayır | CTA hedefi |
| `ctaLabel` | string | Hayır | CTA yazısı |

**Header'lar**

| Header | Açıklama |
| --- | --- |
| `Authorization` | Bearer token |
| `Content-Type` | `image/*`, `video/*` veya `application/octet-stream` |
| `x-file-name` | Orijinal dosya adı |

**Başarılı Yanıt — `200 OK`**

Bu endpoint standart `Story` DTO'sunu döner. Video için `mediaUrl` alanı doğrudan HLS manifest'ine işaret eder.

---

## Boş Durum Davranışı

Aktif story grubu yoksa `GET /story-groups` şu yanıtı döner:

```json
{
  "success": true,
  "meta": {
    "total": 0,
    "limit": 10,
    "nextCursor": null
  },
  "data": []
}
```

Hiç story içermeyen grup listede yer almaz. Stories dizisi hiçbir zaman `null` dönmez, en kötü durumda boş dizi (`[]`) döner.

---

## Hata Yanıtı Formatı

Tüm hata yanıtları aynı yapıyı kullanır:

```json
{
  "success": false,
  "error": {
    "code": "story_not_found",
    "message": "Requested story does not exist or has expired."
  }
}
```
