-- Gate TP auto-close on entry actually being filled.
-- New signals start not-entered; the price-event loop latches this true once
-- price trades into the entry zone.
ALTER TABLE "trade_ideas" ADD COLUMN "entered" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: signals that already exist were created under the old logic, so
-- assume they were validly entered — this keeps any in-flight trades auto-closing.
UPDATE "trade_ideas" SET "entered" = true;
