-- 1-on-1 coaching offers surfaced under Education. Each offer belongs to a
-- coach; members tap through to a DM where the coach quotes pricing.

CREATE TABLE "coaching_offers" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "coverage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "coachId" TEXT NOT NULL,
    CONSTRAINT "coaching_offers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "coaching_offers_createdAt_idx" ON "coaching_offers"("createdAt");

ALTER TABLE "coaching_offers" ADD CONSTRAINT "coaching_offers_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
