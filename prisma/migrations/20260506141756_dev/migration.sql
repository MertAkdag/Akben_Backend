-- CreateEnum
CREATE TYPE "StoryGroupType" AS ENUM ('brand', 'user');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('image', 'video');

-- CreateEnum
CREATE TYPE "CtaType" AS ENUM ('product', 'collection', 'link', 'design');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('ios', 'android', 'web');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('scheduled', 'active', 'expired', 'soldOut', 'cancelled');

-- CreateEnum
CREATE TYPE "DealType" AS ENUM ('daily', 'flash', 'weekend');

-- CreateEnum
CREATE TYPE "FlashDealCtaType" AS ENUM ('product', 'link', 'whatsapp');

-- CreateEnum
CREATE TYPE "FlashDealInteractionType" AS ENUM ('impression', 'click', 'claim', 'share');

-- CreateTable
CREATE TABLE "StoryGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT NOT NULL,
    "type" "StoryGroupType" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "posterUrl" TEXT,
    "mediaType" "MediaType" NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ctaType" "CtaType",
    "ctaValue" TEXT,
    "ctaLabel" TEXT,
    "originalMediaUrl" TEXT,
    "optimizedFormat" TEXT,
    "hlsManifestUrl" TEXT,
    "hlsPreviewSegmentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mediaBytes" INTEGER,
    "mediaWidth" INTEGER,
    "mediaHeight" INTEGER,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryView" (
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL,
    "ctaClicked" BOOLEAN NOT NULL,
    "ctaClickedAt" TIMESTAMP(3),
    "platform" "Platform" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryView_pkey" PRIMARY KEY ("userId","storyId")
);

-- CreateTable
CREATE TABLE "FlashDeal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "imageUrls" TEXT[],
    "originalMilyem" DECIMAL(6,2) NOT NULL,
    "dealMilyem" DECIMAL(6,2) NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL,
    "totalStock" INTEGER NOT NULL,
    "remainingStock" INTEGER NOT NULL,
    "type" "DealType" NOT NULL DEFAULT 'daily',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'scheduled',
    "targetTier" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "productId" TEXT,
    "ctaLabel" TEXT NOT NULL DEFAULT 'Sepete Ekle',
    "ctaType" "FlashDealCtaType" NOT NULL DEFAULT 'product',
    "ctaValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FlashDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashDealInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "type" "FlashDealInteractionType" NOT NULL,
    "platform" "Platform" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlashDealInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoryGroup_priority_id_idx" ON "StoryGroup"("priority" DESC, "id");

-- CreateIndex
CREATE INDEX "Story_groupId_order_idx" ON "Story"("groupId", "order");

-- CreateIndex
CREATE INDEX "Story_expiresAt_idx" ON "Story"("expiresAt");

-- CreateIndex
CREATE INDEX "StoryView_storyId_idx" ON "StoryView"("storyId");

-- CreateIndex
CREATE INDEX "FlashDeal_status_startsAt_idx" ON "FlashDeal"("status", "startsAt");

-- CreateIndex
CREATE INDEX "FlashDeal_endsAt_idx" ON "FlashDeal"("endsAt");

-- CreateIndex
CREATE INDEX "FlashDeal_type_status_idx" ON "FlashDeal"("type", "status");

-- CreateIndex
CREATE INDEX "FlashDeal_deletedAt_idx" ON "FlashDeal"("deletedAt");

-- CreateIndex
CREATE INDEX "FlashDealInteraction_dealId_type_idx" ON "FlashDealInteraction"("dealId", "type");

-- CreateIndex
CREATE INDEX "FlashDealInteraction_userId_dealId_idx" ON "FlashDealInteraction"("userId", "dealId");

-- CreateIndex
CREATE INDEX "FlashDealInteraction_createdAt_idx" ON "FlashDealInteraction"("createdAt");

-- CreateIndex
CREATE INDEX "FlashDealInteraction_dealId_createdAt_idx" ON "FlashDealInteraction"("dealId", "createdAt");

-- CreateIndex
CREATE INDEX "FlashDealInteraction_userId_createdAt_idx" ON "FlashDealInteraction"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "StoryGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryView" ADD CONSTRAINT "StoryView_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashDealInteraction" ADD CONSTRAINT "FlashDealInteraction_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "FlashDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
