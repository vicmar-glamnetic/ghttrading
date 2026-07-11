-- Add ACCM account number captured from members before they can use the app.
ALTER TABLE "users" ADD COLUMN "accmNumber" TEXT;
