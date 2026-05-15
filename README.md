# Story API (Backend)

[docs/StoryEndpoints.md](docs/StoryEndpoints.md) sözleşmesine uygun Express + Prisma + PostgreSQL servisi. Kimlik doğrulama ayrı bir auth backend’inde; bu API yalnızca Bearer JWT doğrular.

## Gereksinimler

- Node.js 20+
- PostgreSQL (Prisma 7 ile çalışma zamanında `@prisma/adapter-pg` + `pg` kullanılır)

## Kurulum

```bash
npm install
cp .env.example .env
```

`.env` içinde:

- `DATABASE_URL`: Prisma CLI / migrate için (ör. `postgresql://...` veya Prisma’nın verdiği `prisma+postgres://...`).
- `POSTGRES_DIRECT_URL`: Uygulamanın `pg` ile bağlanması için **doğrudan** `postgresql://...` URL’i. `DATABASE_URL` yalnızca `prisma+` ise bu alan **zorunludur**.
- `JWT_SECRET` (HS256) veya `JWT_PUBLIC_KEY` (RS256): Auth backend ile **aynı** imzalama parametreleri.
- İsteğe bağlı: `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_USER_ID_CLAIM` (varsayılan `sub`).

Veritabanı şeması:

```bash
npx prisma migrate deploy
# veya geliştirme
npx prisma migrate dev
npx prisma generate
```

Örnek içerik:

```bash
npm run db:seed
```

## Çalıştırma

```bash
npm run dev
```

- Sağlık: `GET http://localhost:3001/health` (auth yok)
- API: `http://localhost:3001/v1/...` — tüm rotalar `Authorization: Bearer <accessToken>` ister.

## API özeti (`/v1`)

| Metot | Yol | Açıklama |
| ----- | --- | -------- |
| GET | `/story-groups` | Cursor sayfalama: `limit`, `cursor` |
| GET | `/story-groups/:groupId` | Tek grup |
| PATCH | `/stories/:storyId/seen` | Tekil görüldü |
| POST | `/story-views/batch` | Toplu görüntüleme (en fazla 50) |
| POST | `/admin/story-groups/:groupId/stories` | Raw binary upload + image/WebP-AVIF veya video/HLS işleme |

## Medya pipeline

- Upload endpoint `application/octet-stream`, `image/*` veya `video/*` raw body kabul eder.
- Image upload'lar otomatik olarak `webp` veya `avif` çıktısına ve kare thumbnail'e çevrilir.
- Video upload'lar HLS VOD (`master.m3u8` + variant playlist + `.ts` segmentler) olarak üretilir.
- Video süresi `STORY_VIDEO_MAX_SECONDS` üstündeyse `STORY_VIDEO_OVERFLOW_POLICY=reject|trim` uygulanır.
- Story DTO'su video için `hlsManifestUrl` ve ilk 2-3 saniyelik `hlsPreviewSegmentUrls` alanlarını döner; mobil istemci bunları startup cache için kullanır.
- İşlenmiş asset'ler `/media/<assetId>/...` altında servis edilir. Prod ortamında `STORY_MEDIA_PUBLIC_BASE_URL` ile CDN origin'i verin.

## Expo / istemci

1. Auth backend’inden `accessToken` alın.
2. Story isteklerinde header: `Authorization: Bearer <accessToken>`.
3. Base URL’yi ortamınıza göre ayarlayın (`EXPO_PUBLIC_STORY_API_URL` vb.).

### Hızlı test (JWT üretimi)

Auth servisiniz yoksa, **yalnızca yerel test** için aynı `JWT_SECRET` ile örnek token:

```bash
node -e "console.log(require('jsonwebtoken').sign({ sub: 'user_test_1' }, 'change-me-use-long-random-string', { algorithm: 'HS256' }))"
```

Ardından:

```bash
curl -s -H "Authorization: Bearer <TOKEN>" "http://localhost:3001/v1/story-groups?limit=10"
```

## Scriptler

| Komut | Açıklama |
| ----- | -------- |
| `npm run dev` | `ts-node-dev` ile geliştirme |
| `npm run build` | `tsc` |
| `npm start` | `dist/server.js` |
| `npm run prisma:generate` | Prisma Client |
| `npm run prisma:migrate` | `prisma migrate dev` |
| `npm run db:seed` | `prisma db seed` |
