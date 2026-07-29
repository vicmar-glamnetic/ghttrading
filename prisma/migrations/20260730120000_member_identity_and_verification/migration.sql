-- Member identity: public display name is "<Name> - <accmNumber>", with the real
-- name kept private (staff + owner only), plus proof-of-account verification.
ALTER TABLE "users" ADD COLUMN "realName" TEXT;
ALTER TABLE "users" ADD COLUMN "accmProofUrl" TEXT;
ALTER TABLE "users" ADD COLUMN "accmVerifyStatus" TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE "users" ADD COLUMN "accmProofAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "accmVerifiedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "accmVerifiedById" TEXT;
ALTER TABLE "users" ADD COLUMN "accmRejectReason" TEXT;

CREATE INDEX "users_accmVerifyStatus_idx" ON "users"("accmVerifyStatus");

-- Staff are never gated, so they start out verified rather than nagged.
UPDATE "users" SET "accmVerifyStatus" = 'verified', "accmVerifiedAt" = NOW()
WHERE "role" IN ('admin', 'coach');

-- E-mail codes that re-confirm a sensitive account change.
CREATE TABLE "security_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "security_codes_userId_purpose_key" ON "security_codes"("userId", "purpose");
CREATE INDEX "security_codes_expires_idx" ON "security_codes"("expires");
