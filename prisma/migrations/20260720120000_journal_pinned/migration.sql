-- Pin journal entries.
--
-- A member can pin the entries they keep coming back to (a trading plan, a
-- recurring mistake, a rules checklist) so they sit at the top of the list
-- instead of scrolling past everything newer. Advisory sort only; existing
-- entries are all unpinned.
ALTER TABLE "journal_entries" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;

-- The list is ordered pinned-first, then newest-first, per author. Swap the old
-- (authorId, createdAt) index for one that covers the new ordering.
DROP INDEX "journal_entries_authorId_createdAt_idx";
CREATE INDEX "journal_entries_authorId_pinned_createdAt_idx" ON "journal_entries"("authorId", "pinned", "createdAt");
