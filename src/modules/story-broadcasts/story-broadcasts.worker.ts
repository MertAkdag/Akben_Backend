import { getEnv } from "../../config/env";
import { getChannelAdapter } from "./story-broadcasts.channels";
import {
  storyBroadcastsRepository,
  type ChannelJobWithBroadcast,
} from "./story-broadcasts.repository";

/**
 * Story Broadcast worker — Postgres job kuyruğu.
 *
 * Redis/BullMQ yok; flash-deals cron'uyla aynı setInterval deseni. Her tick'te:
 *   1) Çökme sonrası 'processing'te asılı kalan job'ları geri al (stale reclaim).
 *   2) İşlenmeye hazır (pending + zamanı gelmiş) job'ları al, kanal adapter'ıyla yayınla.
 *   3) Başarı/başarısızlık + retry/backoff uygula, broadcast durumunu roll-up et.
 *
 * Kanallar bağımsız/non-fatal: bir kanal patlarsa diğerleri etkilenmez.
 */

let running = false;

// 'processing'te bu süreden uzun asılı kalan job çökmüş sayılır → pending'e döner.
// IG video polling timeout'unun üstünde bir pay bırakır.
function staleThresholdMs(): number {
  return getEnv().INSTAGRAM_PUBLISH_POLL_TIMEOUT_MS + 60_000;
}

export async function runStoryBroadcastWorkerTick(): Promise<void> {
  if (running) return; // overlap koruması (interval + anlık dürtme aynı anda gelebilir)
  running = true;
  try {
    const env = getEnv();
    const now = new Date();

    await storyBroadcastsRepository.reclaimStaleJobs(new Date(now.getTime() - staleThresholdMs()));

    const jobs = await storyBroadcastsRepository.findDueJobs(now, env.STORY_BROADCAST_WORKER_BATCH);
    for (const job of jobs) {
      await processJob(job);
    }
  } finally {
    running = false;
  }
}

async function processJob(job: ChannelJobWithBroadcast): Promise<void> {
  // Atomik sahiplen — yarışta başkası aldıysa çık.
  const claimed = await storyBroadcastsRepository.claimJob(job.id);
  if (!claimed) return;

  // claim DB'de attempts++ yaptı; bu denemenin numarası:
  const attemptNumber = job.attempts + 1;
  const env = getEnv();

  const adapter = getChannelAdapter(job.channel);
  if (!adapter) {
    await storyBroadcastsRepository.markJobSkipped(job.id, "channel_not_supported");
    await storyBroadcastsRepository.recomputeBroadcastStatus(job.broadcastId);
    return;
  }
  if (!adapter.isConfigured()) {
    await storyBroadcastsRepository.markJobSkipped(job.id, "channel_not_configured");
    await storyBroadcastsRepository.recomputeBroadcastStatus(job.broadcastId);
    return;
  }

  try {
    const { externalId } = await adapter.publish(job.broadcast);
    await storyBroadcastsRepository.markJobPublished(job.id, externalId);
  } catch (err) {
    const message = (err instanceof Error ? err.message : String(err)).slice(0, 1000);
    if (attemptNumber >= job.maxAttempts) {
      await storyBroadcastsRepository.markJobFailed(job.id, message);
    } else {
      const backoffSeconds = env.STORY_BROADCAST_RETRY_BASE_SECONDS * Math.pow(2, attemptNumber - 1);
      const nextAttemptAt = new Date(Date.now() + backoffSeconds * 1000);
      await storyBroadcastsRepository.markJobRetry(job.id, message, nextAttemptAt);
    }
  }

  await storyBroadcastsRepository.recomputeBroadcastStatus(job.broadcastId);
}

/**
 * setInterval tabanlı worker başlatıcı (flash-deals cron deseni).
 * app.ts'te bir kez çağrılır.
 */
export function startStoryBroadcastWorker(): void {
  const intervalMs = getEnv().STORY_BROADCAST_WORKER_INTERVAL_MS;
  console.log(`[StoryBroadcast Worker] Started — running every ${Math.round(intervalMs / 1000)}s`);

  void runStoryBroadcastWorkerTick().catch((err) =>
    console.error("[StoryBroadcast Worker] Error:", err),
  );

  setInterval(() => {
    void runStoryBroadcastWorkerTick().catch((err) =>
      console.error("[StoryBroadcast Worker] Error:", err),
    );
  }, intervalMs);
}
