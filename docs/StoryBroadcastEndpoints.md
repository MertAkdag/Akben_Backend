# Story Broadcast API — Çok-Kanallı Yayın

Tek bir admin yükleme aksiyonuyla bir story'i **eşzamanlı olarak birden fazla kanala** yayınlar. V1 kanalları: **uygulama içi (inapp)** ve **Instagram**. (WhatsApp pluggable mimaride sonraki faz.)

---

## Genel Bilgiler

**Base URL:** `https://api.example.com/v1`
**Auth:** Bearer token + **admin rolü** (`jwtAuth` + `adminAuth` → `SUPER_ADMIN` / `ADMIN`)
**Format:** İstek gövdesi ham medya baytı, ayarlar query string'de. Yanıtlar JSON.

### Nasıl çalışır

1. Admin medyayı (image/video) ham olarak yükler. Medya **bir kez** işlenir:
   - image → `webp`/`avif` (in-app) + gerekiyorsa `JPEG` (Instagram)
   - video → adaptive **HLS** (in-app) + gerekiyorsa tek parça **MP4** (Instagram)
2. Bir `StoryBroadcast` + her hedef kanal için bir `StoryChannelJob` oluşturulur.
3. **Worker** (Postgres job kuyruğu) job'ları işler: in-app anında yazılır, Instagram Graph API ile yayınlanır.
4. Kanallar **bağımsız ve non-fatal**: biri patlarsa diğerleri etkilenmez. Başarısız job'lar **exponential backoff** ile retry edilir.
5. `scheduledAt` verilirse yayın zamanı gelince worker tarafından gönderilir.

---

## Modeller

### StoryBroadcast

| Alan           | Tip            | Açıklama                                                          |
| -------------- | -------------- | ---------------------------------------------------------------- |
| id             | string         | Yayın ID'si                                                      |
| mediaType      | enum           | `image` / `video`                                                |
| mediaUrl       | string         | In-app birincil asset (image: webp/avif, video: HLS master)      |
| thumbnailUrl   | string         | Önizleme görseli                                                 |
| posterUrl      | string \| null | Video kapak görseli                                              |
| igMediaUrl     | string \| null | Instagram-uyumlu rendition (JPEG/MP4) — Instagram hedefliyse dolu |
| durationMs     | number         | Gösterim süresi                                                  |
| caption        | string \| null | Açıklama metni                                                   |
| cta            | CTA \| null    | Call-to-action (in-app story'ye geçer)                           |
| groupName      | string         | Oluşturulan in-app grubun adı                                    |
| groupAvatarUrl | string         | In-app grup avatarı                                              |
| targetChannels | enum[]         | `inapp` / `instagram`                                            |
| expiresAt      | string         | In-app story bitiş zamanı (ISO 8601)                            |
| scheduledAt    | string \| null | İleri tarihli yayın zamanı — `null` ise hemen                   |
| status         | enum           | `scheduled` / `processing` / `partial` / `completed` / `failed`  |
| createdBy      | string \| null | Yayını oluşturan admin (token'dan)                              |
| createdAt      | string         | Oluşturulma zamanı                                               |
| updatedAt      | string         | Güncellenme zamanı                                               |
| jobs           | ChannelJob[]   | Kanal başına teslimat durumu                                    |

### StoryChannelJob

| Alan          | Tip            | Açıklama                                                          |
| ------------- | -------------- | ---------------------------------------------------------------- |
| channel       | enum           | `inapp` / `instagram` / `whatsapp`                               |
| status        | enum           | `pending` / `processing` / `published` / `failed` / `skipped`    |
| attempts      | number         | Yapılan deneme sayısı                                            |
| maxAttempts   | number         | Maksimum deneme (varsayılan 5)                                   |
| externalId    | string \| null | IG media id / in-app story id                                    |
| lastError     | string \| null | Son hata mesajı                                                  |
| nextAttemptAt | string \| null | Sonraki retry zamanı                                            |
| publishedAt   | string \| null | Yayınlanma zamanı                                               |

**Durum notları**

- `skipped`: kanal yapılandırılmamış (örn. Instagram creds yok). Yayını **başarısız saymaz**.
- Broadcast `status` roll-up: tümü published → `completed`; bazısı failed ama en az biri published → `partial`; hiçbiri yayınlanamadı → `failed`.

---

## Endpointler

### 1. Yayın oluştur (raw upload)

```
POST /admin/story-broadcasts
```

Ham medyayı işler ve hedef kanallara yayına alır.

**Query Parametreleri**

| Parametre        | Tip    | Zorunlu | Açıklama                                                       |
| ---------------- | ------ | ------- | -------------------------------------------------------------- |
| `mediaType`      | enum   | Evet    | `image` / `video`                                              |
| `channels`       | string | Hayır   | Virgülle ayrık: `inapp,instagram`. Varsayılan `inapp`          |
| `expiresAt`      | string | Evet    | In-app story TTL (ISO 8601)                                    |
| `scheduledAt`    | string | Hayır   | İleri tarihli yayın. `expiresAt`'ten önce olmalı               |
| `durationMs`     | number | Hayır   | Image gösterim süresi (1000–60000)                            |
| `caption`        | string | Hayır   | Açıklama metni                                                |
| `groupName`      | string | Hayır   | In-app grup adı — boşsa `STORY_BRAND_NAME`                    |
| `groupAvatarUrl` | string | Hayır   | In-app grup avatarı — boşsa `STORY_BRAND_AVATAR_URL`         |
| `ctaType`        | enum   | Hayır   | `product` / `collection` / `link` / `design` (üçü birlikte)   |
| `ctaValue`       | string | Hayır   | CTA hedefi                                                    |
| `ctaLabel`       | string | Hayır   | CTA yazısı                                                   |
| `overflowPolicy` | enum   | Hayır   | `reject` / `trim` (video > 60sn)                              |
| `imageFormat`    | enum   | Hayır   | `webp` / `avif`                                               |

**Header'lar:** `Authorization: Bearer <token>`, `Content-Type: image/* | video/* | application/octet-stream`, `x-file-name` (opsiyonel).

**Örnek**

```
POST /v1/admin/story-broadcasts?mediaType=video&channels=inapp,instagram&expiresAt=2026-07-01T09:00:00Z&caption=Yeni%20Sezon
Content-Type: video/mp4
x-file-name: promo.mp4
<binary>
```

**Başarılı Yanıt — `200 OK`** → `StoryBroadcast` DTO'su (job'lar `pending`/`processing` ile başlar).

### 2. Yayınları listele

```
GET /admin/story-broadcasts?status=&page=1&limit=20
```

`{ success, meta: { total, page, limit }, data: StoryBroadcast[] }` döner. `status` ile filtrelenebilir.

### 3. Tek yayın detayı

```
GET /admin/story-broadcasts/:id
```

Kanal job durumlarıyla birlikte tek `StoryBroadcast` döner. Bulunamazsa `404 broadcast_not_found`.

### 4. Başarısız kanalları yeniden dene

```
POST /admin/story-broadcasts/:id/retry
```

`failed` durumdaki kanal job'larını yeniden kuyruğa alır (attempts sıfırlanır). Güncel `StoryBroadcast`'i döner.

---

## Hata Yanıtları

| Kod | error.code                | Açıklama                                |
| --- | ------------------------- | --------------------------------------- |
| 400 | `missing_binary_body`     | Gövde ham medya değil                   |
| 401 | `unauthorized`            | Geçersiz/eksik token                    |
| 403 | `forbidden`               | Admin yetkisi yok                       |
| 404 | `broadcast_not_found`     | Yayın bulunamadı                        |
| 415 | `media_type_mismatch`     | Dosya tipi `mediaType` ile uyuşmuyor    |
| 422 | `validation_error`        | Query doğrulama hatası                  |
| 422 | `channel_not_supported`   | Desteklenmeyen kanal istendi            |
| 422 | `video_duration_exceeded` | Video > 60sn ve `overflowPolicy=reject` |
| 500 | `ig_rendition_failed`     | Instagram rendition üretilemedi         |

---

## Instagram entegrasyon notları

- Gereksinim: **FB Page'e bağlı Instagram Business/Creator hesabı** + uzun ömürlü token.
- Medya **public URL**'den erişilebilir olmalı (`STORY_MEDIA_PUBLIC_BASE_URL` veya request host). IG sunucusu medyayı çeker.
- Story video: **MP4 (H.264/AAC), ≤ 60sn**. Story image: **JPEG**. HLS/webp **kabul edilmez** — bu yüzden `igMediaUrl` ayrı üretilir.
- Günlük yayın limiti vardır (~25/24s).
- Env eksikse instagram job'u `skipped` olur; broadcast yine `completed` (in-app yayınlandıysa) sayılabilir.
