import type { Prisma, StoryBroadcast } from "../../generated/prisma/index";
import { prisma } from "../../config/prisma";

// Job + ait olduğu broadcast birlikte (worker'ın yayın için ihtiyacı olan her şey).
export type ChannelJobWithBroadcast = Prisma.StoryChannelJobGetPayload<{
  include: { broadcast: true };
}>;

export type BroadcastWithJobs = Prisma.StoryBroadcastGetPayload<{
  include: { jobs: true };
}>;

export type CreateBroadcastInput = Omit<
  Prisma.StoryBroadcastCreateInput,
  "jobs" | "status"
> & {
  status: Prisma.StoryBroadcastCreateInput["status"];
  channels: Prisma.StoryChannelJobCreateManyBroadcastInput["channel"][];
  jobNextAttemptAt: Date | null;
};

export class StoryBroadcastsRepository {
  /**
   * Broadcast + her hedef kanal için bir job kaydını tek transaction'da oluşturur.
   * jobNextAttemptAt: scheduledAt (ileri tarih) ya da null (hemen).
   */
  async createBroadcastWithJobs(input: CreateBroadcastInput): Promise<BroadcastWithJobs> {
    const { channels, jobNextAttemptAt, ...broadcastData } = input;
    return prisma.storyBroadcast.create({
      data: {
        ...broadcastData,
        jobs: {
          create: channels.map((channel) => ({
            channel,
            status: "pending",
            nextAttemptAt: jobNextAttemptAt,
          })),
        },
      },
      include: { jobs: true },
    });
  }

  async findById(id: string): Promise<BroadcastWithJobs | null> {
    return prisma.storyBroadcast.findUnique({
      where: { id },
      include: { jobs: true },
    });
  }

  async list(params: {
    page: number;
    limit: number;
    status?: Prisma.StoryBroadcastWhereInput["status"];
  }): Promise<{ total: number; items: BroadcastWithJobs[] }> {
    const where: Prisma.StoryBroadcastWhereInput = {};
    if (params.status) where.status = params.status;
    const [total, items] = await Promise.all([
      prisma.storyBroadcast.count({ where }),
      prisma.storyBroadcast.findMany({
        where,
        include: { jobs: true },
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
    ]);
    return { total, items };
  }

  // ─────────────────────────── Worker ───────────────────────────

  /** İşlenmeye hazır job'lar: pending + (nextAttemptAt null ya da geçmiş). */
  async findDueJobs(now: Date, limit: number): Promise<ChannelJobWithBroadcast[]> {
    return prisma.storyChannelJob.findMany({
      where: {
        status: "pending",
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
      },
      include: { broadcast: true },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  /**
   * Job'u atomik olarak sahiplenir: status pending ise processing'e çevirir ve attempts++ yapar.
   * Yarışta (başka tick aldıysa) count 0 döner → false.
   */
  async claimJob(jobId: string): Promise<boolean> {
    const res = await prisma.storyChannelJob.updateMany({
      where: { id: jobId, status: "pending" },
      data: { status: "processing", attempts: { increment: 1 } },
    });
    return res.count === 1;
  }

  async markJobPublished(jobId: string, externalId: string | null): Promise<void> {
    await prisma.storyChannelJob.update({
      where: { id: jobId },
      data: {
        status: "published",
        externalId,
        publishedAt: new Date(),
        lastError: null,
      },
    });
  }

  /** Geçici hata: tekrar denenecek. pending'e geri alır, backoff zamanı koyar. */
  async markJobRetry(jobId: string, error: string, nextAttemptAt: Date): Promise<void> {
    await prisma.storyChannelJob.update({
      where: { id: jobId },
      data: { status: "pending", lastError: error, nextAttemptAt },
    });
  }

  /** Kalıcı hata: maxAttempts tükendi. */
  async markJobFailed(jobId: string, error: string): Promise<void> {
    await prisma.storyChannelJob.update({
      where: { id: jobId },
      data: { status: "failed", lastError: error, nextAttemptAt: null },
    });
  }

  /** Kanal yapılandırılmamış / desteklenmiyor — retry edilmez. */
  async markJobSkipped(jobId: string, reason: string): Promise<void> {
    await prisma.storyChannelJob.update({
      where: { id: jobId },
      data: { status: "skipped", lastError: reason, nextAttemptAt: null },
    });
  }

  /** Çökme sonrası 'processing'te asılı kalan job'ları (updatedAt eski) pending'e geri alır. */
  async reclaimStaleJobs(olderThan: Date): Promise<number> {
    const res = await prisma.storyChannelJob.updateMany({
      where: { status: "processing", updatedAt: { lt: olderThan } },
      data: { status: "pending" },
    });
    return res.count;
  }

  /** Retry endpoint: failed job'ları yeniden kuyruğa alır, attempts sıfırlar. */
  async requeueFailedJobs(broadcastId: string): Promise<number> {
    const res = await prisma.storyChannelJob.updateMany({
      where: { broadcastId, status: "failed" },
      data: { status: "pending", attempts: 0, lastError: null, nextAttemptAt: null },
    });
    return res.count;
  }

  /**
   * Broadcast durumunu job'lardan roll-up eder:
   *   herhangi biri pending/processing → processing (scheduledAt gelecekteyse scheduled)
   *   hepsi terminal: failed yok → completed; published var → partial; aksi → failed
   * skipped non-blocking (yapılandırılmamış kanal başarıyı engellemez).
   */
  async recomputeBroadcastStatus(broadcastId: string): Promise<void> {
    const broadcast = await prisma.storyBroadcast.findUnique({
      where: { id: broadcastId },
      include: { jobs: { select: { status: true } } },
    });
    if (!broadcast) return;
    const jobs = broadcast.jobs;
    const anyActive = jobs.some((j) => j.status === "pending" || j.status === "processing");

    let status: Prisma.StoryBroadcastUpdateInput["status"];
    if (anyActive) {
      const future = broadcast.scheduledAt != null && broadcast.scheduledAt.getTime() > Date.now();
      status = future ? "scheduled" : "processing";
    } else {
      const published = jobs.filter((j) => j.status === "published").length;
      const failed = jobs.filter((j) => j.status === "failed").length;
      if (failed === 0) status = "completed";
      else if (published > 0) status = "partial";
      else status = "failed";
    }

    await prisma.storyBroadcast.update({ where: { id: broadcastId }, data: { status } });
  }

  // ─────────────────────────── In-App kanal ───────────────────────────

  /**
   * Broadcast'in işlenmiş medyasından bir StoryGroup + Story oluşturur.
   * Her broadcast kendi grubunu yaratır (karar: Instagram gibi bağımsız gönderi).
   * Oluşturulan story id'sini döner (job.externalId olarak saklanır).
   */
  async createInAppStory(broadcast: StoryBroadcast): Promise<string> {
    const story = await prisma.story.create({
      data: {
        group: {
          create: {
            name: broadcast.groupName,
            avatarUrl: broadcast.groupAvatarUrl,
            type: "brand",
            priority: 0,
          },
        },
        mediaType: broadcast.mediaType,
        mediaUrl: broadcast.mediaUrl,
        thumbnailUrl: broadcast.thumbnailUrl,
        posterUrl: broadcast.posterUrl,
        optimizedFormat: broadcast.optimizedFormat,
        hlsManifestUrl: broadcast.hlsManifestUrl,
        hlsPreviewSegmentUrls: broadcast.hlsPreviewSegmentUrls,
        mediaBytes: broadcast.mediaBytes,
        mediaWidth: broadcast.mediaWidth,
        mediaHeight: broadcast.mediaHeight,
        durationMs: broadcast.durationMs,
        order: 0,
        expiresAt: broadcast.expiresAt,
        ctaType: broadcast.ctaType,
        ctaValue: broadcast.ctaValue,
        ctaLabel: broadcast.ctaLabel,
        processedAt: new Date(),
      },
      select: { id: true },
    });
    return story.id;
  }
}

export const storyBroadcastsRepository = new StoryBroadcastsRepository();
