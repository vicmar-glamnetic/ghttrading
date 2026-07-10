-- Lesson runtime, in seconds. Nullable on purpose: YouTube doesn't expose
-- duration via oEmbed, so it is scraped best-effort. A lesson with no known
-- runtime shows none, rather than a made-up one.
ALTER TABLE "lessons" ADD COLUMN "durationSec" INTEGER;
