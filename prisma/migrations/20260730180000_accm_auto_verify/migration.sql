-- Self-verification for new sign-ups: from now on an ACCM member is verified as
-- soon as they upload their account screenshot, instead of waiting in the staff
-- queue. Existing accounts keep the manual review, so this defaults to false and
-- is set to true only by the registration route.
ALTER TABLE "users" ADD COLUMN "accmAutoVerify" BOOLEAN NOT NULL DEFAULT false;
