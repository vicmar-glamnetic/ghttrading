-- Presence: the app heartbeats this column while a member has it open.
-- NULL means "never seen since this shipped" — rendered as offline, not unknown.
ALTER TABLE "users" ADD COLUMN "lastSeenAt" TIMESTAMP(3);

-- The admin members list filters/sorts on recency of this column.
CREATE INDEX "users_lastSeenAt_idx" ON "users"("lastSeenAt");
