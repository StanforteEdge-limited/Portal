/*
  Warnings:

  - A unique constraint covering the columns `[receipt_number]` on the table `sta_finance_income_entries` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "MailProvider" AS ENUM ('GOOGLE', 'MICROSOFT');

-- AlterTable
ALTER TABLE "sta_finance_income_entries" ADD COLUMN     "pledge_id" UUID,
ADD COLUMN     "receipt_number" VARCHAR(60);

-- CreateTable
CREATE TABLE "sta_finance_pledges" (
    "id" UUID NOT NULL,
    "pledge_number" VARCHAR(60) NOT NULL,
    "organization_id" BIGINT,
    "donor_id" UUID NOT NULL,
    "grant_id" UUID,
    "fund_id" UUID,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "received_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "pledged_at" TIMESTAMP(3) NOT NULL,
    "expected_at" TIMESTAMP(3),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "purpose" TEXT,
    "notes" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_pledges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_system_versions" (
    "id" UUID NOT NULL,
    "platform" VARCHAR(50) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "version" VARCHAR(50) NOT NULL,
    "min_version" VARCHAR(50) NOT NULL,
    "force_update" BOOLEAN NOT NULL DEFAULT false,
    "release_notes" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sta_system_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_accounts" (
    "id" BIGSERIAL NOT NULL,
    "profile_id" BIGINT NOT NULL,
    "provider" "MailProvider" NOT NULL,
    "email_address" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(255),
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "token_expires_at" TIMESTAMP(3) NOT NULL,
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "label" VARCHAR(100),
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_headers" (
    "id" BIGSERIAL NOT NULL,
    "account_id" BIGINT NOT NULL,
    "uid" VARCHAR(255) NOT NULL,
    "folder" VARCHAR(500) NOT NULL,
    "subject" VARCHAR(998),
    "from_name" VARCHAR(255),
    "from_email" VARCHAR(255),
    "date" TIMESTAMP(3),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "has_attachment" BOOLEAN NOT NULL DEFAULT false,
    "snippet" VARCHAR(500),
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_headers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sta_finance_pledges_donor_id_idx" ON "sta_finance_pledges"("donor_id");

-- CreateIndex
CREATE INDEX "sta_finance_pledges_grant_id_idx" ON "sta_finance_pledges"("grant_id");

-- CreateIndex
CREATE INDEX "sta_finance_pledges_status_idx" ON "sta_finance_pledges"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sta_finance_pledges_organization_id_pledge_number_key" ON "sta_finance_pledges"("organization_id", "pledge_number");

-- CreateIndex
CREATE UNIQUE INDEX "sta_system_versions_platform_module_key" ON "sta_system_versions"("platform", "module");

-- CreateIndex
CREATE INDEX "mail_accounts_profile_id_idx" ON "mail_accounts"("profile_id");

-- CreateIndex
CREATE INDEX "mail_headers_account_id_folder_idx" ON "mail_headers"("account_id", "folder");

-- CreateIndex
CREATE UNIQUE INDEX "mail_headers_account_id_folder_uid_key" ON "mail_headers"("account_id", "folder", "uid");

-- CreateIndex
CREATE UNIQUE INDEX "sta_finance_income_entries_receipt_number_key" ON "sta_finance_income_entries"("receipt_number");

-- CreateIndex
CREATE INDEX "sta_finance_income_entries_pledge_id_idx" ON "sta_finance_income_entries"("pledge_id");

-- AddForeignKey
ALTER TABLE "sta_finance_pledges" ADD CONSTRAINT "sta_finance_pledges_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "sta_finance_donors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_pledges" ADD CONSTRAINT "sta_finance_pledges_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "sta_finance_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_pledges" ADD CONSTRAINT "sta_finance_pledges_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "sta_finance_funds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_income_entries" ADD CONSTRAINT "sta_finance_income_entries_pledge_id_fkey" FOREIGN KEY ("pledge_id") REFERENCES "sta_finance_pledges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_accounts" ADD CONSTRAINT "mail_accounts_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "sta_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_headers" ADD CONSTRAINT "mail_headers_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "mail_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
