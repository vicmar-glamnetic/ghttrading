-- We now take clients from VT Markets as well as ACCM, so record WHICH broker a
-- member signed up with instead of inferring it from the accmMember boolean.
--
-- accmMember stays, and stays authoritative for billing/gating: it means "a
-- partner broker, so free". Both accm and vtmarkets set it true. Every existing
-- row pre-dates VT Markets, so a true accmMember can only mean ACCM.
ALTER TABLE "users" ADD COLUMN "broker" TEXT NOT NULL DEFAULT 'accm';
UPDATE "users" SET "broker" = 'other' WHERE "accmMember" = false;
