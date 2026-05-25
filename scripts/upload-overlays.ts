/**
 * Bulk Category Overlay Image Uploader
 *
 * Yerel bir klasördeki görselleri toplu olarak yükler.
 *
 * Klasör yapısı (zorunlu):
 *   <input-dir>/1.jpg       → categoryId 1 (ZİNCİRLER)
 *   <input-dir>/7.png       → categoryId 7 (MADALYONLAR)
 *   <input-dir>/11.webp     → categoryId 11 (HİNT)
 *   ...
 *
 * Dosya adı = categoryId. Uzantı serbest (jpg/jpeg/png/webp).
 *
 * KULLANIM:
 *   1) Backend'e bir kere login ol, accessToken'ı al
 *   2) Aşağıdaki üç değişkeni düzenle (API_URL, TOKEN, INPUT_DIR)
 *   3) Çalıştır:
 *        npx -p ts-node ts-node scripts/upload-overlays.ts
 *
 * Hatalı dosyalar skip edilir, sonuçlar listelenir.
 */

import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { URL } from "url";

// ─── KONFİG — bu üç değeri düzenle ───

const API_URL = process.env.API_URL ?? "https://akbenapi.ekler.app";
const TOKEN = process.env.TOKEN ?? "";
const INPUT_DIR = process.env.INPUT_DIR ?? "./overlay-images";

// ─── Mime type haritası ───

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

// ─── Main ───

async function main() {
  if (!TOKEN) {
    console.error("✖ TOKEN env değişkeni boş. Şöyle çalıştır:");
    console.error("    TOKEN=<jwt> INPUT_DIR=./overlay-images npx -p ts-node ts-node scripts/upload-overlays.ts");
    process.exit(1);
  }

  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`✖ Klasör bulunamadı: ${INPUT_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(INPUT_DIR).filter((f) => !f.startsWith("."));
  console.log(`📂 ${INPUT_DIR} → ${files.length} dosya bulundu\n`);

  const results: { file: string; categoryId: number; ok: boolean; message: string }[] = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const stem = path.basename(file, ext);
    const categoryId = parseInt(stem, 10);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      results.push({ file, categoryId: 0, ok: false, message: "dosya adı sayı değil — skip" });
      continue;
    }

    const mime = MIME_BY_EXT[ext];
    if (!mime) {
      results.push({ file, categoryId, ok: false, message: `desteklenmeyen uzantı ${ext}` });
      continue;
    }

    const filePath = path.join(INPUT_DIR, file);
    const buffer = fs.readFileSync(filePath);

    process.stdout.write(`  → categoryId ${categoryId} (${file}, ${(buffer.length / 1024).toFixed(0)} KB) ... `);

    try {
      const response = await uploadOverlay(categoryId, buffer, mime);
      const ok = response.statusCode === 200;
      results.push({
        file,
        categoryId,
        ok,
        message: ok ? "yüklendi" : `HTTP ${response.statusCode}: ${response.body.slice(0, 200)}`,
      });
      console.log(ok ? "✅" : `❌ ${response.statusCode}`);
    } catch (err: any) {
      results.push({ file, categoryId, ok: false, message: err?.message ?? String(err) });
      console.log(`❌ ${err?.message ?? err}`);
    }
  }

  console.log("\n📊 Özet:");
  const success = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`   ✅ Başarılı: ${success}`);
  console.log(`   ❌ Başarısız: ${failed.length}`);

  if (failed.length > 0) {
    console.log("\nHata detayı:");
    for (const r of failed) {
      console.log(`   - ${r.file} (categoryId ${r.categoryId}): ${r.message}`);
    }
  }
}

function uploadOverlay(
  categoryId: number,
  buffer: Buffer,
  contentType: string,
): Promise<{ statusCode: number; body: string }> {
  const url = new URL(`${API_URL}/v1/admin/catalog/overlays/${categoryId}/image`);
  const client = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(
      {
        method: "POST",
        host: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname,
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": contentType,
          "Content-Length": buffer.length,
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ statusCode: res.statusCode ?? 0, body }));
      },
    );

    req.on("error", reject);
    req.setTimeout(30_000, () => {
      req.destroy(new Error("timeout"));
    });
    req.write(buffer);
    req.end();
  });
}

main().catch((err) => {
  console.error("✖ Beklenmeyen hata:", err);
  process.exit(1);
});
