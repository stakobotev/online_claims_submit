-- CreateTable
CREATE TABLE "OAuthExchangeCode" (
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "consumedAt" TIMESTAMPTZ,

    CONSTRAINT "OAuthExchangeCode_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE INDEX "OAuthExchangeCode_expiresAt_idx" ON "OAuthExchangeCode"("expiresAt");
