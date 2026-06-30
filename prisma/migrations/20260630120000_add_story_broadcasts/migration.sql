-- CreateEnum
CREATE TYPE "StoryChannel" AS ENUM ('inapp', 'instagram', 'whatsapp');

-- CreateEnum
CREATE TYPE "BroadcastStatus" AS ENUM ('scheduled', 'processing', 'partial', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "ChannelJobStatus" AS ENUM ('pending', 'processing', 'published', 'failed', 'skipped');

-- CreateTable
CREATE TABLE "StoryBroadcast" (
    "id" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "posterUrl" TEXT,
    "optimizedFormat" TEXT,
    "hlsManifestUrl" TEXT,
    "hlsPreviewSegmentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "igMediaUrl" TEXT,
    "mediaBytes" INTEGER,
    "mediaWidth" INTEGER,
    "mediaHeight" INTEGER,
    "durationMs" INTEGER NOT NULL,
    "caption" TEXT,
    "ctaType" "CtaType",
    "ctaValue" TEXT,
    "ctaLabel" TEXT,
    "groupName" TEXT NOT NULL,
    "groupAvatarUrl" TEXT NOT NULL,
    "targetChannels" "StoryChannel"[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "status" "BroadcastStatus" NOT NULL DEFAULT 'processing',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryChannelJob" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "channel" "StoryChannel" NOT NULL,
    "status" "ChannelJobStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "externalId" TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryChannelJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoryBroadcast_status_scheduledAt_idx" ON "StoryBroadcast"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "StoryBroadcast_createdAt_idx" ON "StoryBroadcast"("createdAt");

-- CreateIndex
CREATE INDEX "StoryChannelJob_status_nextAttemptAt_idx" ON "StoryChannelJob"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoryChannelJob_broadcastId_channel_key" ON "StoryChannelJob"("broadcastId", "channel");

-- AddForeignKey
ALTER TABLE "StoryChannelJob" ADD CONSTRAINT "StoryChannelJob_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "StoryBroadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
