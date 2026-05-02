-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StoryGroupType" AS ENUM ('brand', 'user');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('image', 'video');

-- CreateEnum
CREATE TYPE "CtaType" AS ENUM ('product', 'collection', 'link', 'design');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('ios', 'android', 'web');

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

-- CreateIndex
CREATE INDEX "StoryGroup_priority_id_idx" ON "StoryGroup"("priority" DESC, "id");

-- CreateIndex
CREATE INDEX "Story_groupId_order_idx" ON "Story"("groupId", "order");

-- CreateIndex
CREATE INDEX "Story_expiresAt_idx" ON "Story"("expiresAt");

-- CreateIndex
CREATE INDEX "StoryView_storyId_idx" ON "StoryView"("storyId");

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "StoryGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryView" ADD CONSTRAINT "StoryView_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
