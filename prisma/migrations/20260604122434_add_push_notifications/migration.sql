-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CAMPAIGN', 'ORDER', 'PRICE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'sending', 'sent', 'failed');

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expoPushToken" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "tier" TEXT,
    "appVersion" TEXT,
    "locale" TEXT,
    "deviceName" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "userId" TEXT NOT NULL,
    "campaigns" BOOLEAN NOT NULL DEFAULT true,
    "orders" BOOLEAN NOT NULL DEFAULT true,
    "prices" BOOLEAN NOT NULL DEFAULT true,
    "system" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT false,
    "sms" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "deepLink" TEXT,
    "campaignId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationCampaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'CAMPAIGN',
    "data" JSONB NOT NULL DEFAULT '{}',
    "deepLink" TEXT,
    "targetTiers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetPlatforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "audienceCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_expoPushToken_key" ON "Device"("expoPushToken");

-- CreateIndex
CREATE INDEX "Device_userId_idx" ON "Device"("userId");

-- CreateIndex
CREATE INDEX "Device_tier_idx" ON "Device"("tier");

-- CreateIndex
CREATE INDEX "Device_disabledAt_idx" ON "Device"("disabledAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_campaignId_idx" ON "Notification"("campaignId");

-- CreateIndex
CREATE INDEX "NotificationCampaign_status_createdAt_idx" ON "NotificationCampaign"("status", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "NotificationCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
