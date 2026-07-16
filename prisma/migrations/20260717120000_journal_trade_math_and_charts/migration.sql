-- Turn the journal from a diary into a trading journal, and let a chart back up
-- a setup.
--
-- Journal entries gain the prices a trade actually happened at. With entry +
-- exit + lots we can derive P&L instead of trusting a hand-typed number, and
-- with a stop we can express the result in R — the only unit that makes two
-- trades comparable. `setup` tags the entry from the community's fixed
-- vocabulary (lib/setups.ts) so analytics can group by what the trader was doing.
--
-- All nullable with no backfill: existing entries have none of these prices, so
-- they keep their hand-typed pnl and simply show no R (deriveTrade falls back).
ALTER TABLE "journal_entries" ADD COLUMN "entryPrice" DOUBLE PRECISION;
ALTER TABLE "journal_entries" ADD COLUMN "exitPrice" DOUBLE PRECISION;
ALTER TABLE "journal_entries" ADD COLUMN "stopPrice" DOUBLE PRECISION;
ALTER TABLE "journal_entries" ADD COLUMN "targetPrice" DOUBLE PRECISION;
ALTER TABLE "journal_entries" ADD COLUMN "lots" DOUBLE PRECISION;
ALTER TABLE "journal_entries" ADD COLUMN "rMultiple" DOUBLE PRECISION;
ALTER TABLE "journal_entries" ADD COLUMN "setup" TEXT;
ALTER TABLE "journal_entries" ADD COLUMN "chartUrl" TEXT;

CREATE INDEX "journal_entries_authorId_setup_idx" ON "journal_entries"("authorId", "setup");

-- Coaches post entry/SL/TP as bare numbers with no way to show the chart that
-- explains them. This is the URL of that marked-up screenshot (Vercel Blob).
ALTER TABLE "trade_ideas" ADD COLUMN "chartUrl" TEXT;
