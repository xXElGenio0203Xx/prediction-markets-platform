-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CREATED');

-- CreateTable
CREATE TABLE "MarketRequest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "resolutionCriteria" TEXT NOT NULL,
    "suggestedCloseDate" TIMESTAMP(3),
    "requestedBy" TEXT,
    "requesterEmail" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdMarketId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketRequest_createdMarketId_key" ON "MarketRequest"("createdMarketId");

-- CreateIndex
CREATE INDEX "MarketRequest_status_idx" ON "MarketRequest"("status");

-- CreateIndex
CREATE INDEX "MarketRequest_requestedBy_idx" ON "MarketRequest"("requestedBy");

-- CreateIndex
CREATE INDEX "MarketRequest_createdAt_idx" ON "MarketRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "MarketRequest" ADD CONSTRAINT "MarketRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketRequest" ADD CONSTRAINT "MarketRequest_createdMarketId_fkey" FOREIGN KEY ("createdMarketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;
