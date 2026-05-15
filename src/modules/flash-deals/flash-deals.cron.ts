import { flashDealsRepository } from "./flash-deals.repository";

/**
 * Flash Deal cron işlemi.
 * Her dakika çağrılarak deal durumlarını günceller:
 *   scheduled → active  (başlangıç zamanı gelmiş olanlar)
 *   active    → expired (bitiş zamanı geçmiş olanlar)
 *   active    → soldOut (stok tükenmiş olanlar)
 *
 * Not: Service katmanı da effectiveStatus hesaplar.
 * Cron arka plan temizliği yapar, API doğru sonuç döner cron gecikse bile.
 */
export async function runFlashDealCronTick(): Promise<void> {
  const now = new Date();

  const [activated, expired, soldOut] = await Promise.all([
    flashDealsRepository.activateScheduledDeals(now),
    flashDealsRepository.expireActiveDeals(now),
    flashDealsRepository.markSoldOutDeals(),
  ]);

  const total = activated.count + expired.count + soldOut.count;
  if (total > 0) {
    console.log(
      `[FlashDeal Cron] ${activated.count} activated, ${expired.count} expired, ${soldOut.count} soldOut`,
    );
  }
}

/**
 * setInterval tabanlı cron başlatıcı.
 * node-cron bağımlılığı eklemeden çalışır.
 * Her 60 saniyede bir deal durumlarını kontrol eder.
 */
export function startFlashDealCron(): void {
  console.log("[FlashDeal Cron] Started — running every 60 seconds");

  // İlk çalıştırma hemen yapılsın
  void runFlashDealCronTick().catch((err) =>
    console.error("[FlashDeal Cron] Error:", err),
  );

  // Sonra her 60 saniyede bir
  setInterval(() => {
    void runFlashDealCronTick().catch((err) =>
      console.error("[FlashDeal Cron] Error:", err),
    );
  }, 60_000);
}
