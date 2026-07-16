-- Zone alerts + risk guardrails.
--
-- Zone alerts: PriceAlert could only watch an absolute price, so a member had to
-- read a coach's signal, pick a number out of it themselves, and set an alert for
-- that. `kind='zone'` + `ideaId` instead watches the signal's own entry zone,
-- read live off the idea so a coach editing the zone keeps the alert honest.
-- Existing rows are all absolute-price alerts, hence the 'price' default.
ALTER TABLE "price_alerts" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'price';
ALTER TABLE "price_alerts" ADD COLUMN "ideaId" TEXT;

ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_ideaId_fkey"
  FOREIGN KEY ("ideaId") REFERENCES "trade_ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One zone alert per member per signal. Postgres treats NULLs as distinct in a
-- unique index, so this constrains zone alerts without touching price alerts
-- (which all have ideaId IS NULL and must stay unlimited).
CREATE UNIQUE INDEX "price_alerts_userId_ideaId_key" ON "price_alerts"("userId", "ideaId");

-- Risk guardrails: opt-in, advisory. NULL = no guardrail, which is every
-- existing member until they set one.
ALTER TABLE "users" ADD COLUMN "dailyLossLimit" DOUBLE PRECISION;
ALTER TABLE "users" ADD COLUMN "maxTradesPerDay" INTEGER;
