-- CreateEnum
CREATE TYPE "UserTier" AS ENUM ('wholesale', 'vip_wholesale');

-- CreateEnum
CREATE TYPE "InquiryType" AS ENUM ('price_request', 'availability', 'custom_order', 'wholesale_bulk', 'general');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('pending', 'assigned', 'responded', 'closed');

-- CreateTable
CREATE TABLE "HomepageSection" (
    "id" TEXT NOT NULL,
    "sectionType" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "layoutVariant" TEXT NOT NULL DEFAULT 'default',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "backgroundColor" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "targetTiers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minAppVersion" TEXT,
    "dataConfig" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT,
    "type" "InquiryType" NOT NULL DEFAULT 'general',
    "status" "InquiryStatus" NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "quantity" INTEGER,
    "preferredContact" TEXT NOT NULL DEFAULT 'whatsapp',
    "urgency" TEXT NOT NULL DEFAULT 'standard',
    "assignedRepId" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "platform" "Platform" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomepageSection_enabled_priority_idx" ON "HomepageSection"("enabled", "priority" DESC);

-- CreateIndex
CREATE INDEX "HomepageSection_sectionType_idx" ON "HomepageSection"("sectionType");

-- CreateIndex
CREATE INDEX "Inquiry_userId_createdAt_idx" ON "Inquiry"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Inquiry_status_idx" ON "Inquiry"("status");

-- CreateIndex
CREATE INDEX "Inquiry_assignedRepId_idx" ON "Inquiry"("assignedRepId");

-- CreateIndex
CREATE INDEX "UserEvent_userId_eventType_idx" ON "UserEvent"("userId", "eventType");

-- CreateIndex
CREATE INDEX "UserEvent_eventType_createdAt_idx" ON "UserEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "UserEvent_createdAt_idx" ON "UserEvent"("createdAt");
