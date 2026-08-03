-- Runtime, admin-flippable site settings as key → value strings. First user is
-- the "email everyone when a new signal drops" toggle on /admin/settings.
-- No rows are seeded: a missing key means "unset", and each reader falls back to
-- its own default (that toggle defaults to OFF, so nothing mails until an admin
-- turns it on).
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);
