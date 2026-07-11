-- Enforce one ACCM number per member. Postgres allows multiple NULLs in a
-- unique index, so members who haven't entered a number yet are unaffected.
CREATE UNIQUE INDEX "users_accmNumber_key" ON "users"("accmNumber");
