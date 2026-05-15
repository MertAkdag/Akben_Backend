-- CreateTable
CREATE TABLE "CategoryOverlay" (
    "id" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "bannerTitle" TEXT,
    "bannerSubtitle" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "ctaLabel" TEXT DEFAULT 'KEŞFET',
    "ctaStyle" TEXT DEFAULT 'primary',
    "aspectRatio" TEXT DEFAULT '3:4',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryOverlay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryOverlay_categoryId_key" ON "CategoryOverlay"("categoryId");

-- CreateIndex
CREATE INDEX "CategoryOverlay_featured_displayOrder_idx" ON "CategoryOverlay"("featured", "displayOrder" DESC);
