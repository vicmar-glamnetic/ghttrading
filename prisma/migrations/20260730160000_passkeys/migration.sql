-- Passkeys (WebAuthn credentials) for Face ID / Touch ID / Windows Hello sign-in.
CREATE TABLE "authenticators" (
    "id" TEXT NOT NULL,
    "credentialID" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialPublicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "credentialDeviceType" TEXT NOT NULL DEFAULT 'singleDevice',
    "credentialBackedUp" BOOLEAN NOT NULL DEFAULT false,
    "transports" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "authenticators_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "authenticators_credentialID_key" ON "authenticators"("credentialID");
CREATE INDEX "authenticators_userId_idx" ON "authenticators"("userId");

ALTER TABLE "authenticators" ADD CONSTRAINT "authenticators_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
