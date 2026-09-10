-- CreateTable
CREATE TABLE "sta_finance_settings" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "config" JSONB,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sta_finance_settings_key_key" ON "sta_finance_settings"("key");
